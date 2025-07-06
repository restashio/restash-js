The official Restash js client for uploading files directly from the browser.

## Installation

```bash
npm install @restash/restash-js
````

## Quickstart

Upload files directly from the browser to Restash.

```typescript
import { createRestashUploader } from "@restash/restash-js";

const upload = createRestashUploader({ publicKey: "pk_..." });

const result = await upload(file, {
  path: "uploads/",
  onProgress: ({ percent }) => {
    console.log(`Uploading... ${percent}%`)
  },
});

console.log("File uploaded:", result.url);
```

## If your team requires signed uploads

Create a route to generate signatures using the `generateSig` function with your `secret key`

```typescript
import { generateSig } from "@restash/restash-js";

const { payload, signature } = generateSig(process.env.RESTASH_SECRET_KEY!);

return NextResponse.json({ payload, signature });
```

Then pass your signature route to the `createRestashUploader` function:

```typescript
const upload = createRestashUploader({
  publicKey: "pk_...",
  handleSignature: "/api/restash/signature",
});
```

Do not call `generateSig` from the browser - this requires your secret key and must be executed in a server
environment only.

## Feedback & Support

Have questions or feature requests?
Drop an issue on [Github](https://github.com/restashio/restash-js/issues)