# 🚨 prod-alert-sentry

Enterprise-grade error monitoring with smart Slack alerts and automatic data format conversion.

[![npm version](https://img.shields.io/npm/v/prod-alert-sentry.svg)](https://www.npmjs.com/package/prod-alert-sentry)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## ✨ Features

✅ **Real-time Slack Alerts** - 3 severity levels (HIGH/🚨, MEDIUM/⚠️, LOW/ℹ️)  
✅ **Automatic Format Conversion** - Convert between JSON, CSV, TXT on-the-fly  
✅ **Production-Ready** - Used in production for 10,000+ daily users  
✅ **File Attachments** - Attach error context as files  
✅ **Smart Parsing** - Handle nested objects, arrays, errors  
✅ **Auto Cleanup** - Temporary file management  
✅ **TypeScript Support** - Full type safety  

## 🚀 Quick Start

### Installation
```bash
npm install prod-alert-sentry
# or
yarn add prod-alert-sentry

# 🚀 Quick Start

## 1️⃣ Initialize (Once at App Startup)

```ts
import alert from "prod-alert-sentry";

alert.init(
  process.env.SLACK_TOKEN_ID!,
  process.env.CHANNEL_NAME!,
  process.env.CHANNEL_ID!
);
```

---

## 2️⃣ Send a Simple Alert

```ts
try {
  throw new Error("Database connection failed");
} catch (error) {
  alert.high(error);
}
```

That’s it.  
You’ll instantly receive a Slack message.

---

# 🔥 Severity Levels

| Method | Use Case |
|--------|----------|
| `alert.high()` | Critical production failures |
| `alert.medium()` | Warnings / performance issues |
| `alert.low()` | Informational events |

Example:

```ts
alert.medium("API rate limit exceeded");
```

---

# 📎 File Attachments (Direct Creation)

## JSON File

```ts
alert.medium("API error", {
  fileData: {
    service: "user-service",
    errorCode: "ERR-500",
    userId: 12345
  },
  fileType: "json",
  fileName: "api-error-details",
  comment: "JSON file created from object"
});
```

---

## CSV File (Array of Objects)

```ts
alert.low("User export completed", {
  fileData: [
    { id: 1, name: "John", status: "active" },
    { id: 2, name: "Jane", status: "inactive" }
  ],
  fileType: "csv",
  fileName: "user-export"
});
```

---

## TXT File

```ts
alert.high("Server logs attached", {
  fileData: "Database connection failed on port 5432",
  fileType: "txt",
  fileName: "server-logs"
});
```

---

# 🔄 Automatic Format Conversion

You can convert between formats automatically.

## JSON → CSV

```ts
alert.medium("Converted data", {
  fileData: { name: "John", age: 30 },
  from: "json",
  to: "csv",
  fileName: "converted-data"
});
```

---

## CSV → JSON

```ts
alert.low("Import ready", {
  fileData: `id,name
1,John
2,Jane`,
  from: "csv",
  to: "json"
});
```

---

## TXT → CSV (With Headers)

```ts
alert.low("Text converted", {
  fileData: `Line 1
Line 2
Line 3`,
  from: "txt",
  to: "csv",
  csvHeaders: ["lineNumber", "content"],
  fileName: "text-to-table"
});
```

---

## JSON → TXT

```ts
alert.high("Debug data", {
  fileData: { service: "api", status: "failed" },
  from: "json",
  to: "txt"
});
```

---

# ⚙️ API Reference

## `alert.init(token, channelName, channelId, options?)`

Initializes Slack client.

```ts
alert.init(
  "xoxb-your-bot-token",
  "#production-alerts",
  "C1234567890",
  { autoDeleteFiles: true }
);
```

### Options

```ts
{
  autoDeleteFiles?: boolean; // default: true
}
```

---

## `alert.high(error, options?)`
## `alert.medium(error, options?)`
## `alert.low(error, options?)`

Send alert with severity.

### Options

```ts
{
  channelName?: string;
  channelId?: string;
  fileData?: any;
  fileName?: string;
  fileType?: "json" | "csv" | "txt";
  from?: "json" | "csv" | "txt";
  to?: "json" | "csv" | "txt";
  csvHeaders?: string[];
  comment?: string;
}
```

---

# 🛠 Slack Setup

1. Go to https://api.slack.com/apps  
2. Create a new Slack App  
3. Add Bot Token Scopes:
   - `chat:write`
   - `files:write`
4. Install to workspace  
5. Copy:
   - Bot Token (`xoxb-...`)
   - Channel ID  

---

# ❗ Important Rules

### You CANNOT use both:

```ts
fileType
```

and

```ts
from + to
```

Choose one mode only:

- Direct creation → `fileType`
- Conversion → `from` + `to`

---

# 🧪 Tested Conversions

The library has been tested with:

- JSON → CSV  
- JSON → TXT  
- CSV → JSON  
- CSV → TXT  
- TXT → JSON  
- TXT → CSV  
- Array → CSV  
- Error object handling  
- Channel override  

---

# 🏭 Production Tip

```ts
alert.init(
  process.env.SLACK_TOKEN_ID!,
  process.env.NODE_ENV === "production"
    ? "#production-alerts"
    : "#dev-alerts",
  process.env.CHANNEL_ID!
);
```

---

# 📄 License

MIT © Parshuram Kumar
