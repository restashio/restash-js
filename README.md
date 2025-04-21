# @restash/client

The official Restash client for uploading files directly from the browser.

---

## Installation

```bash
npm install @restash/client
````

---

## Quickstart

Uploads directly from the browser to Restash.

```typescript
import {createRestashUploader} from "@restash/client";

const uploader = createRestashUploader({publicKey: "pk_..."});

const result = await uploader(file as File, {
  path: "uploads/", // optional
  onProgress: ({percent}) => {
    console.log(`Uploading... ${percent}%`);
  },
});

console.log("File uploaded:", result.url);
```

---

## If your team requires signed uploads

Generate a signature on your server using your Restash `secretKey`

```typescript
import {generateRestashSig} from "@restash/client";

const {payload, signature} = generateRestashSig(process.env.RESTASH_SECRET_KEY!);

return NextResponse.json({payload, signature});
```

Then pass your signature route to the client:

```typescript
const result = await upload(file as File, {
  handleSignature: "/api/restash/signature"
});
```

Do not call `generateRestashSig` from the browser - this requires your secret key and must be executed in a server
environment only.

---

## More coming soon

- React hooks
- Uploader components
- File picker
- More...

## Feedback & Support

Have questions or feature requests?
Drop an issue on [Github](https://github.com/restashio/restash-client/issues)