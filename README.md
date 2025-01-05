```markdown
# Systematic

A streamlined **Visual Studio Code**–based tool for non-developers, **Systematic** blends robust version control, AI-driven workflows, and user-friendly interfaces. Instead of bombarding you with technical jargon, it presents a simpler, more visual approach to managing and automating your content—perfect for tasks like translation, document handling, and AI-powered analysis.

---

## Key Highlights

- **Minimalist UI**
  Reduces clutter by hiding developer-centric menus and panels. Big, clear buttons and an intuitive layout guide you to the right features.

- **Built-in Git Safety**
  All your files and changes are versioned automatically. Thanks to simplified commands (e.g., “Save” instead of `commit`), you get the power of Git without the confusion.

- **AI & Effect.ts Automation**
  Compose workflows in a visual **Blockly** editor. Under the hood, these workflows run on [`Effect.ts`](https://github.com/Effect-TS/core) pipelines—powerful but still accessible.

- **Easy Content Ingestion**
  Drag or paste images, PDFs, or text directly into Systematic. Preconfigured extensions automatically preview and track these assets in Git.

- **Domain-Specific Tools**
  Extend Systematic with specialized features—like website scraping, XLIFF generation, or translation workflows—built as simple “blocks” that you can drag into your automation.

## How It Works

1. **VS Code Core**

   - Systematic runs on Electron, just like standard VS Code. We keep as much of the codebase intact as possible for compatibility.

2. **Extensions**

   - We bundle key VS Code extensions for PDF viewing, image preview, and domain-specific tasks (like translation pipelines).
   - A custom **Source Control** extension simplifies Git interactions with friendlier labels.

3. **AI/Chat Architecture**

   - Systematic hooks into VS Code’s [Chat extension API](https://code.visualstudio.com/api/extension-guides/chat), letting you address the `@systematic` participant.
   - When you ask for something domain-specific, Systematic can either rely on an external service or local scripts.

4. **Effect.ts Automation**

   - Users can build advanced content pipelines without writing code by combining “Effect blocks” in a Blockly UI.
   - Advanced users may edit these workflows directly in JavaScript/TypeScript if desired.
```
