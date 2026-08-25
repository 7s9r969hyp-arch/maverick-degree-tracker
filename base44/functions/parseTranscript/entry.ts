import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { file_url } = await req.json();
    if (!file_url) return Response.json({ error: 'file_url is required' }, { status: 400 });

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are parsing a college transcript PDF. Extract every course the student has actually completed (ignore courses with grade Z or courses listed as "in progress" or with 0 credits earned). For each completed course return: course_code (e.g. "CIS 101"), course_name, credits (number), grade, term (e.g. "Fall 2024"). Also include transfer credits if they have a course code listed. Do NOT include summary rows or lines that are not individual courses. Return ONLY a JSON object matching the schema.`,
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
                term: { type: "string" }
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