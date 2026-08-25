import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { file_url } = await req.json();
    if (!file_url) return Response.json({ error: 'file_url is required' }, { status: 400 });

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are parsing a college transcript PDF. Extract every course the student has taken (including transfer credits and courses currently in progress). For each course return: course_code (e.g. "CIS 101"), course_name, credits (number earned), grade, term (e.g. "Fall 2024"), and status. Set status to "in_progress" if the course has no grade yet, or the grade is "Z", "IP", "W", "T", or the course is explicitly listed as "in progress" or "current". Set status to "completed" for all other courses including transfer credits with a passing grade. Do NOT include summary rows, GPA lines, or lines that are not individual courses. Return ONLY a JSON object matching the schema.`,
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