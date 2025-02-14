# Transformer

A fork of VSCode designed for semi professional users to create and share shareable personal programs that run in VSCode.

## Core Concept

Transformer reimagines VS Code as a context-savvy automation platform that can run little programs across the user's desktop without them having to know how to code. VSCode already is capabable of running virtually any program using any programming language, and it has extensive and emerging AI capabilities. Transformer will join the VSCode clone market but aimed at non developers and a simpler, cleaner, and funner take on VSCode

The tactic Transformer uses is to present the user with explicit simple little `Program` for the user that they can see how each `Operation` proceeds. AI can write the programs yet the human can easily, tweak, control, revise, revert, reverse, whatever, hahaha each operation.

Many tools don't offer super precise control like this or if they do its confusing.

Transformer lets the user focus on just making sure a sequence of "things that need to happen" turn green or other wise show status, so they can quickly zoom in on what went wrong or otherwise just get their automation answer or output or whatever out come they wanted from the `Program`.

As the user interacts with their desktop, as they start their day, and check their emails and Slack, and encounter the new problems and solutions of the day, the goal of Transformer is to be a clean, fast efficient tool to move them along that journey.

## Source Code Contribution

Let's cut to the chase of exactly how Transformer is architected on top of VSCode.

Transformer is a fork of VSCode, not an extension. VSCode is made up of internal contributions and external extensions. Transformer wants to run within VSCode to leverage its full power so it is architected as a contribution.

It offers a key contributon called the `Control` Viewlet but before we can understand why we created it we have to look at the internal subsytems of VSCode a bit.

### VCCode Internal Key Systems

Tranformer leverages many but really exposes the power of 2 in particular key built-in VSCode systems:

- The `testing` contribution which provides a general `Testing` explorer viewlet, and a way to invalidate and run tests. It is contributed at path `src/vs/workbench/contrib/testing`.
- The `context key` platform is a very widely used key VSCode system that provides a hierarchicial key value reactive data structure, that powers VSCode's core adaptability, not all of it, but "key" parts of it, haha.

#### the testing contribution

While repurposing the `testing` contribution might seem surprising at first, consider the parallels:

- Just as tests are organized in a tree inside the `Testing` explorer viewlet (like "Frontend Tests > Login Tests > Test Valid Password"), operations in Transformer are organized hierarchically
- Just as tests can be run on demand, operations need to be triggered when needed
- Just as tests have states (passing/failing/running), operations have execution states
- Just as tests need a clear UI to display and manage them, operations need a similar interface

What is a bit different is that operations have parameters. Each operation in the `Program` view can have parameter nodes that define its behavior. Parameters link to context keys, where state is stored between operations, or other operations in the case of jumps or conditional logic.

This is why Transformer takes VSCode's proven testing infrastructure,and repurposed it:

- The `Testing` viewlet is renamed the Transformer `Control` viewlet and adds viewpanes for `Program` where it puts is default testing explorer view.
- "Running a test" becomes "running an operation" or "running the whole program"
- "Test results" become "Program results"
- We can utilize the testing contribution's: 2 "projections", a list or tree projection onto the view, a way for users to see the operations.

These are just examples, there are dozens of ways to utilize the testing contribution. The mapping is clear and easy to understand and since the testing contribution is designed to be very generic anyway, it works well with Transformer's needs.

The beauty of this approach is that we get a robust, well-tested system for managing our operations, complete with:

- A hierarchical tree view for organizing operations
- Built-in execution tracking
- Status indicators
- Detailed result reporting

For users, none of this technical implementation matters - they simply see a clean, organized view of their operations that they can run, monitor, and manage. The Program view also works seamlessly with the `Operation` view below it, where users can configure the parameters for each operation

#### the context key platform

this platform level layer in vscode can be found in `src/vs/platform/contextkey`

it is an absolutely key system and is explained at `src/vs/platform/contextkey/common/explainContextKey.md`

why do we use it? Well VSCode has multiple layers of context, and so do our users and it is a fairly seamless way to get VSCode "moving" in adaptable ways, when paired with access to all the key vscode services. You can run operations, set data/state/etc in context and then have other operations use it, autmating VSCode along with it's key services.

### `Control` viewlet

The `Control` viewlet sits in the coveted sidebar position and controls Transformer with vertically layed out view panes:

#### **Program**

The Program viewpane is where users see and interact with their operations - the building blocks of automation in Transformer. Think of operations as the simple building blocks of your program, like "show a message" or "create a file". These operations need to be:

- Organized in a clear hierarchy.
- Easy to run in response to context changes or manually, which itself is a context change
- Tracked so you can see their status
- Displayed in a user-friendly way
  .
  This is why it is built on the repurposed testing system as explained above.

_Ok, but what are programs? really..._.

Possible answers:

- Programs can be thought of as ways for users to build the equivalent of custom VSCode actions that run across VSCode services and context.
- Programs are event handlers for the DOM
- Programs are widgets to build custom UI
- Programs are scripts that run across the user's desktop and file system, at the Windows/Mac OS terminal and UI layers.
- Programs are agents, made up of sequences of prompts to AI, often invoking tools.

The answer is multiple-choice, all of the above.

In general we want to expose quite a bit of variable surface area in the operations to do a wide range of useful things in the underlying VSCode services, context and UI, the underlying user's computer (accessing their files, their apps, screenshots, voice, and more), and AI with the level of sophistiation, modularity, adaptability found in VSCode.

#### Operation

The next view pane is used to display and edit params and other details about currently selected operation.

E.g. the `dialog show` operation has 2 params:

- `level` a dropdown of values like Info, Debug and more
- `message` the user shoud enter a value or link to a context key.

When wanting to link a param of an operation to a context key

#### **Context**

The Context view is your window into the "memory" of your program - it shows you exactly what your program knows and tracks at any given moment. Think of it as a living snapshot that updates as your program runs, tracking everything from a simple boolean or string to file contents to Transformer's own settings.

The `Context` view is interactive treeview that only shows the context keys from running programs plus VSCode and Transformer's own context keys which you can use in your operations.

For example, when a program is running, you might see:

- File-related context: which files are open, their contents, their status
- AI-related context: which AI models are available, which is selected, and more
- UI-related context: which buttons are active, what text is displayed
- Program-related context: current operation, stored values, calculation results
- Transformer-related context: VSCode settings, environment information

What makes this view powerful is that it's both:

- **Historical**: You can select any operation in your program and see exactly what the context looked like at that point
- **Interactive**: You can explore the full tree of information, expanding branches to dig deeper into specific details

Transformer `Context` is built on top VSCode's powerful and well proven context key system which is well documented at `src/vs/platform/contextkey/common/explainContextKey.md`.

This means it's:

- Fast and reliable (built on proven VSCode technology)
- Automatically updates as your program runs
- Integrates smoothly with other parts of Transformer

For users, this means you can:

1. Debug your programs by seeing exactly what information was available at each step
2. Understand how your operations affect the program's state
3. Verify that your program is tracking the right information
4. Use this information to make your operations smarter and more connected

The Context view works hand-in-hand with the Program and Operation views above it - as you select different operations in the Program view, the Context view updates to show you the state of your program at that exact point in time.

#### **View**

The View pane is your program's view.

What is a view?

A view is a very old computer word for a window into the program. It is a way to interact with the program.

Think of Transformer `View` as a dedicated area where your operations can create interactive interfaces for users. Think of it as a canvas where you can build everything from simple message displays to complex interactive forms, all using familiar VSCode components.

Every UI element in this view is created and controlled by operations in your program. Common UI operations include:

**Basic Elements:**

- `UI Clear` - Reset the workspace to a blank slate
- `UI Text` - Display text with optional formatting
- `UI Button` - Add clickable buttons with custom actions
- `UI Center` - Center-align the following elements
- `UI Input` - Create text input fields
- `UI Select` - Add dropdown selection menus

**Advanced Components:**

- Tables for displaying structured data
- Tree views for hierarchical information
- Progress bars for long-running operations
- File upload zones for handling documents
- Custom forms for data collection

What makes this view powerful is that it:

1. Uses native VSCode UI components, ensuring a consistent look and feel
2. Updates in real-time as your operations execute
3. Integrates with the Context system to track user interactions
4. Supports both simple and complex layouts
5. Works seamlessly with VSCode's theming

For example, you might use the UI view to:

- Display results from operations
- Collect user input through forms
- Show progress during multi-step workflows
- Present interactive data visualizations
- Create wizard-like interfaces for complex tasks

The UI view works closely with other views in the Control viewlet:

- Operations in the Program view control what appears here
- The Operation view lets you configure how UI elements look and behave
- The Context view tracks the state of UI elements and user interactions

This creates a central place where users can interact with your program through familiar, professional-looking interfaces without requiring any web development or design expertise.

## Practical Examples

Let's explore how users can create programs in Transformer, starting with a simple example and moving to a more complex real-world scenario.

### Basic example: Hello World

First, let's create a simple program that shows a message dialog. This example will demonstrate the basic concepts of operations, parameters, and linking.

#### Operation 1: create a `message` context key

1. Click the + button in the Program view
2. Select "context key add" from the quick pick menu
3. In the `Program` view you will see the new operation "context key add" with 2 params: `key` and `value`.
4. In the `Operation` view, you'll see two parameters:
   - Set `key` to "message"
   - Set `value` to "Hello World!"

#### Operation 2: show the message in a dialog

1. Click + again in the `Program` view
2. Select "dialog show" from the quick pick menu
3. In the `Operation` view, you'll see:
   - A `text` parameter
   - A `level` parameter (leave as `Info`)
4. Link the dialog `text` parameter to your `message` context key by right clicking on the `text` parameter and selecting "Link to context key" submenu where you can select the `message` context key.

The Program operation parameters should now indicate the link visually somehow. Selecting the parameter, should highlight the context key and show the link.

Also note that selecting the context key's context menu should reveal a submenu list of operations that depend on the context key for reverse references from context keys to operations.

Now when you run your program, it will show "Hello World!" in a VSCode dialog.

### Advanced Example: RFP Response Generator

Let's explore a real-world example: automating RFP (Request for Proposal) responses using Transformer. This example demonstrates how operations and context work together to solve a complex business problem.

#### The Business Need

A program manager needs to:

- Streamline RFP response creation
- Leverage past successful responses
- Maintain consistent formatting
- Share the solution with their team
- Use AI to improve response quality

#### Building the Program

Let's break this down into clear operations and context building steps:

##### 1. Setup Core Context

```
// Define essential context keys
context key add rfp_content        // Stores the uploaded RFP text
context key add response_library   // Path to successful responses
context key add company_template   // Path to company template
context key add current_sections   // Stores analyzed RFP sections
context key add final_response     // Stores generated response
```

##### 2. Create Upload Interface

```
// Build initial UI
ui clear
ui center
ui heading "RFP Response Generator"
ui file upload {
    param accept = [".doc", ".docx", ".pdf"]
    param output = "rfp_content"  // Links to rfp_content context key
}
ui text "Drag and drop an RFP document or click to upload"
```

##### 3. Document Processing

```
// When file is uploaded (triggered by context change)
operation "Process Document" {
    // Extract text from document
    document parse {
        input = "rfp_content"
        output = "rfp_text"
    }

    // Analyze sections
    ai analyze {
        input = "rfp_text"
        output = "current_sections"
        template = "identify RFP sections and requirements"
    }
}
```

##### 4. Response Generation

```
// Generate response using AI and templates
operation "Generate Response" {
    // First load previous responses
    folder read {
        path = "response_library"
        pattern = "*.docx"
        output = "past_responses"
    }

    // Map sections to past responses
    ai match {
        sections = "current_sections"
        responses = "past_responses"
        output = "mapped_sections"
    }

    // Generate new response
    ai generate {
        input = "mapped_sections"
        template = "company_template"
        output = "final_response"
    }
}
```

##### 5. Output Interface

```
// Create response interface
ui clear
ui split {
    // Preview pane
    ui panel "Preview" {
        ui document viewer {
            content = "final_response"
        }
    }

    // Actions pane
    ui panel "Actions" {
        ui button "Save to Library" {
            action = "save_response"
        }
        ui button "Copy to Clipboard" {
            action = "copy_response"
        }
        ui button "Export as Word" {
            action = "export_response"
        }
    }
}
```

#### Key Context Keys

The program builds context systematically:

1. **Document Context**

   - `rfp_content`: Raw uploaded document
   - `rfp_text`: Extracted text content
   - `current_sections`: Analyzed RFP sections

2. **Library Context**

   - `response_library`: Path to response library
   - `past_responses`: Loaded previous responses
   - `company_template`: Company formatting template

3. **Generation Context**
   - `mapped_sections`: Matched sections to responses
   - `final_response`: Generated response document
   - `generation_status`: Tracks generation progress

#### Making it More Powerful

The program can be enhanced with additional operations:

1. **Section Management**

```
operation "Manage Sections" {
    ui tree view {
        data = "current_sections"
        allow_edit = true
        on_change = "update_response"
    }
}
```

2. **Template Selection**

```
operation "Select Template" {
    ui select {
        options = "company_templates"
        output = "selected_template"
        on_change = "refresh_preview"
    }
}
```

3. **Response Library Management**

```
operation "Manage Library" {
    ui split {
        ui tree "Categories" {
            data = "response_categories"
        }
        ui list "Responses" {
            data = "filtered_responses"
        }
    }
}
```

#### The Power of Context

What makes this program powerful is how it builds context explicitly:

1. Each operation has clear inputs and outputs
2. Context keys store state between operations
3. UI updates automatically based on context changes
4. Operations can be triggered by context changes

The program manager can:

- See exactly what information is available at each step
- Modify operations or add new ones easily
- Share the program with colleagues
- Track the response generation process
- Maintain a growing library of successful responses

This example shows how Transformer makes complex workflows manageable by breaking them down into discrete operations that build and transform context systematically.

#### Not another API, local-first

The RFP example demonstrates how we're approaching AI assistance differently. Instead of building yet another API-based service or web platform, we're creating local-first tools that enhance how people already work.
The prompting strategy shown earlier - with structured scoring, clear evaluation criteria, and business context preservation - becomes more powerful when integrated directly into professional desktop tools like VSCode. Users can:

- Work with their local files and tools naturally
- Share automation programs simply, without dealing with APIs
- Keep control of their data and workflows
- Use AI to enhance existing processes
- Collaborate through familiar tools

This "local-first" approach focuses on making users more effective with tools they already have, rather than requiring them to adopt new services or learn new APIs. The AI prompting becomes part of their natural workflow, accessible through simple desktop programs that can be easily shared with colleagues.
Key benefits:

- Natural desktop integration
- Simple program sharing
- Local data control
- Enhanced existing workflows
- Reduced complexity

This creates a more sustainable and practical way to bring AI assistance into professional work, built on proven tools rather than new services.
