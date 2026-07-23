Black Forest Labs logo
flux-2-dev
Text-to-Image • Black Forest Labs

@cf/black-forest-labs/flux-2-dev
FLUX.2 [dev] is an image model from Black Forest Labs where you can generate highly realistic and detailed images, with multi-reference support.

Model Info	
Terms and License	link ↗
Partner	Yes
Unit Pricing	$0.00021 per input 512x512 tile, per step, $0.00041 per output 512x512 tile, per step
Usage
TypeScript
curl
export interface Env {
  AI: Ai;
}

export default {
  async fetch(request, env): Promise<Response> {
    const form = new FormData();
    form.append('prompt', 'a sunset with a dog');
    form.append('width', '1024');
    form.append('height', '1024');

    // FormData doesn't expose its serialized body or boundary. Passing it to a
    // Request (or Response) constructor serializes it and generates the Content-Type
    // header with the boundary, which is required for the server to parse the multipart fields.
    const formResponse = new Response(form);
    const formStream = formResponse.body;
    const formContentType = formResponse.headers.get('content-type')!;

    const resp = await env.AI.run("@cf/black-forest-labs/flux-2-dev", {
      multipart: {
        body: formStream,
        contentType: formContentType
      }
    });

    return Response.json(resp);
  },
} satisfies ExportedHandler<Env>;


Parameters
Input
Output
Filter parameters...
▶
multipart
{}
object
body
{}
object
required
contentType
string
required
Black Forest Labs logo
flux-2-klein-9b
Text-to-Image • Black Forest Labs

@cf/black-forest-labs/flux-2-klein-9b
FLUX.2 [klein] 9B is an ultra-fast, distilled image model with enhanced quality. It unifies image generation and editing in a single model, delivering state-of-the-art quality enabling interactive workflows, real-time previews, and latency-critical applications.

Model Info	
Terms and License	link ↗
Partner	Yes
Unit Pricing	$0.015 per first MP (1024x1024), $0.002 per subsequent MP, $0.002 per input image MP
Usage
TypeScript
curl
export interface Env {
  AI: Ai;
}

export default {
  async fetch(request, env): Promise<Response> {
    const form = new FormData();
    form.append('prompt', 'a sunset with a dog');
    form.append('width', '1024');
    form.append('height', '1024');

    // FormData doesn't expose its serialized body or boundary. Passing it to a
    // Request (or Response) constructor serializes it and generates the Content-Type
    // header with the boundary, which is required for the server to parse the multipart fields.
    const formResponse = new Response(form);
    const formStream = formResponse.body;
    const formContentType = formResponse.headers.get('content-type')!;

    const resp = await env.AI.run("@cf/black-forest-labs/flux-2-klein-9b", {
      multipart: {
        body: formStream,
        contentType: formContentType
      }
    });

    return Response.json(resp);
  },
} satisfies ExportedHandler<Env>;


Parameters
Input
Output
Filter parameters...
▶
multipart
{}
object
required
body
{}
object
contentType
string