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

      const prompt = `Look up the academic program requirements for "${program.name}" (${program.degree_type}) at Minnesota State University, Mankato (MNSU) from the official undergraduate catalog (catalog.mnsu.edu or bulletins.mnsu.edu).

This is a ${programTypeLabel}. Return ONLY the ${programTypeLabel}-specific required courses — do NOT include general education courses, goal areas, or university-wide requirements.

For each required course, provide:
- course_code: e.g. "CIS 121", "ACCT 201" (include a space between letters and number)
- course_name: full course name from the catalog
- credits: number of credits (typically 3 or 4)
- category: requirement category, e.g. "${program.name} Core Requirements", "${program.name} Restricted Electives", "${program.name} Required Courses"
- requirement_type: "required" for mandatory courses, "elective" for choice/elective courses
- elective_group: if elective, a group label (e.g. "Elective Group A"); null/omit for required courses
- group_min_credits: if elective group, minimum credits needed from that group; null/omit for required courses

Return a JSON object with a "requirements" array. Only include courses that are part of this specific ${programTypeLabel}. If you cannot find the program in the MNSU catalog, return an empty requirements array.`;

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