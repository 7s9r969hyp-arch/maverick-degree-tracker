import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { file_url } = await req.json();
    if (!file_url) return Response.json({ error: 'file_url is required' }, { status: 400 });

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are parsing a college academic document — either a transcript or a DARS (Degree Audit Reporting System) report from Minnesota State University, Mankato. Extract every individual course the student has taken or is currently enrolled in (including transfer credits). For each course return: course_code (e.g. "CIS 101" or "ACCT200"), course_name, credits (number), grade, term (e.g. "Fall 2024" — convert codes like "F 24" to "Fall 2024", "S 25" to "Spring 2025", "SS26" to "Summer 2026"), and status. Set status to "in_progress" if the grade is "Z", "IP", or the course is marked as currently enrolled/in progress. Set status to "completed" for all other courses with a real grade (including transfer credits with passing grades like TA, TB-, T3, etc.). Do NOT include summary rows, GPA totals, credit totals, requirement headings, or lines that are not individual course records. Return ONLY a JSON object matching the schema.`,
      file_urls: [file_url],
      response_json_schema: {
        type: "object",
        properties: {
          courses: {
            type: "array",
            items: {
              type: "object",
              properties: {
                course_code: { type: "string" },
                course_name: { type: "string" },
                credits: { type: "number" },
                grade: { type: "string" },
                term: { type: "string" },
                status: { type: "string", enum: ["completed", "in_progress"] }
              },
              required: ["course_code"]
            }
          }
        },
        required: ["courses"]
      }
    });

    return Response.json({ courses: result.courses || [] });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}