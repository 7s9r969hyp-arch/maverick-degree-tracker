import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { program_ids } = await req.json();
    if (!Array.isArray(program_ids) || program_ids.length === 0) {
      return Response.json({ error: 'program_ids array is required' }, { status: 400 });
    }
    if (program_ids.length > 8) {
      return Response.json({ error: 'Max 8 programs per call' }, { status: 400 });
    }

    const majors = await base44.asServiceRole.entities.Major.list("name", 500);
    const programs = majors.filter(m => program_ids.includes(m.id));

    if (programs.length === 0) {
      return Response.json({ error: 'No matching programs found' }, { status: 404 });
    }

    const schema = {
      type: "object",
      properties: {
        requirements: {
          type: "array",
          items: {
            type: "object",
            properties: {
              course_code: { type: "string" },
              course_name: { type: "string" },
              credits: { type: "number" },
              category: { type: "string" },
              requirement_type: { type: "string", enum: ["required", "elective"] },
              elective_group: { type: "string" },
              group_min_credits: { type: "number" },
            },
            required: ["course_code", "credits", "category", "requirement_type"]
          }
        }
      },
      required: ["requirements"]
    };

    const processProgram = async (program) => {
      const programTypeLabel = program.degree_type === 'Minor' ? 'minor' :
        program.degree_type === 'Certificate' ? 'certificate' : 'major';

      const prompt = `Look up the academic program requirements for "${program.name}" (${program.degree_type}) at Minnesota State University, Mankato (MNSU) from the official undergraduate catalog at https://www.mnsu.edu/academic-catalog/undergraduate/. Search for the program page (e.g. accounting-bs, psychology-bs, history-bs, dance-minor, etc.).

This is a ${programTypeLabel}. Return ALL courses listed in the program requirements, including:
- Major Common Core courses (required courses)
- Prerequisites to the Major (required courses)
- Required General Education courses that are specifically listed on the program page
- Elective groups (courses where students choose from a list)

For EACH course listed in the program requirements, provide:
- course_code: e.g. "CIS 121", "ACCT 201" (include a space between letters and number)
- course_name: full course name from the catalog
- credits: number of credits (typically 1-5)
- category: the section heading from the catalog page, e.g. "Major Common Core", "Prerequisites to the Major", "Required General Education", "Electives"
- requirement_type: "required" for mandatory courses, "elective" for choice/elective courses (where students pick from a list)
- elective_group: if elective, a group label matching the catalog's group name (e.g. "Foundation in Tech Comm", "Chemistry Electives"); null/omit for required courses
- group_min_credits: if elective group, the minimum credits needed from that group (from the "Choose X Credit(s)" text); null/omit for required courses

IMPORTANT: Be thorough. Include EVERY course listed on the program page. A typical BS major has 30-50 courses totaling 120-128 credits. A typical minor has 5-15 courses totaling 15-25 credits. If the program has elective groups where students "Choose N credits", list ALL the course options in that group and set group_min_credits to N.

Return a JSON object with a "requirements" array. If you cannot find the program in the MNSU catalog, return an empty requirements array.`;

      const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: true,
        model: "gemini_3_flash",
        response_json_schema: schema
      });

      const reqs = (result.requirements || []).map(r => ({
        major_id: program.id,
        category: r.category,
        course_code: r.course_code,
        course_name: r.course_name || "",
        credits: r.credits,
        requirement_type: r.requirement_type || "required",
        elective_group: r.elective_group || null,
        group_min_credits: r.group_min_credits || null,
      }));

      return { program: program.name, degree_type: program.degree_type, count: reqs.length, reqs };
    };

    const batchResults = await Promise.all(programs.map(processProgram));

    const allReqs = [];
    const results = [];
    batchResults.forEach(r => {
      allReqs.push(...r.reqs);
      results.push({ program: r.program, degree_type: r.degree_type, count: r.count });
    });

    if (allReqs.length > 0) {
      await base44.asServiceRole.entities.Requirement.bulkCreate(allReqs);
    }

    return Response.json({ results, totalCreated: allReqs.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}