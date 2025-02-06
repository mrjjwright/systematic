# Transformer

A fork of VSCode designed for semi professional users to create and share shareable personal programs that run in VSCode.

## Core Concept

Transformer reimagines VS Code as a context-controlled automation platform :

- **Everything revolves around tracking content before process** - content is tracked via git and this opens up content first workflows that scale safely as modern dev shows
- **content is context but context is more than content** - A sophisticated reactive structured hierarchy of key/value pairs that determine available operations based on everything from what exact file content is in context, to simple boolean, number and text values, to config to keystokes, to what ui is shown.
- **Program operations transform content and context** - a group of operations is a program and operations are built to automate VSCode straightforwardly in response to context changes. Operations are run  straightforwardly like an assembly language, setting context keys, changing the vscode ui, talking to AI, opering dialogs, processing input, changing the user's desktop, and more.
- **VSCode native UI** - Transformer is built using sophisticated table views, lists, tables, search, files, tasks and more supplied from vscode.
- **Shareable .trans files** - Programs are saved in *.trans files which drive transformer and are editable in a text file by AI or huamns.  Trans files package context and or operations as reusable sharable files via git or any other means.

# Technical Foundation

Content and context are fundamental to how computers process information - they form the building blocks of all software operations. This foundation has several key aspects:

- **Content Tracking**: Content changes constantly and must be precisely tracked. While computers can process these changes very quickly, traditional systems often fail to maintain a clear record of what changed and why.

- **Context Management**: Context goes beyond just file contents - it includes everything from system states to user inputs to program settings. Complexity on the computer crosses several layers and hundreds of interconnected code pieces in order to provide the sophistatated experiences users expect from modern computers and AI.


These 2 things present complexity.  That complexity comes in 2 forms:

## UI Complexity

Many modern web applications have very minimal complexity in the UI layer and most of the complexity is managed in the database.  The modern relational database powers 70% of web applications.

While native apps have increasing complexity that provides sophisticated experiences, and so do games, web apps have fallen behind for the most part with notable exceptions like Figma, Gmail, and other high powered web apps.

Most of these high powered applications have embraced the complexity with bigger more custom codebases that use the full power of modern languages.   This is also precisely what VSCode does with embracing Javascript fully via Typescript.   VSCode has already achieved the high powered success on which Transformer is built.

Web apps that are not high powered like React apps, and other modern framework apps, simply rely on the database for most of the real complexity of the application, a wise choice.   The React component API surface area is an example of something that simplifies the UI layer for this reason but it also prevents really powerful performant modular apps.

## Process, Change, Syncing, Versions, Collaboration, oh my!

To cut to the chase, git solves virtually all of this and has proven itself to be the perfect solution for managing complexity in software development, which is arguably one of the most complex human activities in terms of the demands on collaboration, change, and process.

Yet most modern semi professionals do not work on top of git.

Yes, you say, because git is too complex!

Most users who gto an ATM, use a modern safe double ledger transactional system, even if they can't understand it.  It would be not safe not to.

Most semi professional users should be working on top of and collaborating with git, but they are not.

Because our current tools do not make it easy to do so.

We need the ATMS of git.

So therefore another crucial key to managing complexity of all kinds lies in the integration between VSCode and git, which together provide several crucial capabilities:

1. **Smart File Handling**: VSCode's working copy system ensures you never lose work, eliminating the need for manual saving. This system, proven in production use, is leveraged and extended by Transformer.

2. **Content Versioning**: Git provides cryptographic content tracking, enabling:
   - Safe file exchange between users
   - History tracking with branching
   - Secure content signing
   - Lightweight branching and merging

3. **Seamless Integration**: The connection between VSCode and git must be robust and intuitive, especially for semi-professional users who need to exchange content without deep git expertise.

4. **Discrete Operations**: Transformer builds on top of VSCode and git and organizes all changes into discrete, trackable operations.  The state of the workspace and it's files and hence the underlying git repository and its content is tracked and can be queried at any time.


# The Bridge to Users

While these technical capabilities are powerful, their primary value lies in making sophisticated development workflows accessible to semi-professional users - people who need to create and automate workflows but aren't full-time developers. These users require powerful tools but often lack deep technical expertise in areas like git operations and content tracking.

This creates a specific challenge: How do we expose the power of git-based content tracking and VSCode's technical capabilities while making them approachable? The solution needs to:

- Hide technical complexity while preserving functionality
- Provide clear visibility into what's happening
- Make complex operations intuitive
- Maintain all the benefits of our technical implementation

Improving on top of VSCode's already proven visual workflows emerge as the natural solution to this challenge. They provide a familiar way to understand and control complex operations without requiring deep technical knowledge. By presenting git operations, content tracking, and automation through a visual interface, we can make these powerful tools accessible while maintaining their sophistication.

A viewlet, which are VSCode's main sidebar tabs, is the natural choice for this interface because it integrates seamlessly with VSCode's existing patterns, provides persistent visibility of key controls, and allows users to manage complex operations through familiar tree views, panels, and buttons. This approach leverages VSCode's proven UI patterns while creating a dedicated space for Transformer's unique capabilities.

The goal is for semi-professional users to feel empowered, working with a coherent, flowing interface that make complex operations feel natural and intuitive. By bringing together VSCode's technical capabilities with git's content tracking in an accessible interface, we can sculpt a platform where users can focus on automating their content and context rather than the underlying technology.

## `Control` Viewlet

The `Control` viewlet sits in the coveted sidebar position and controls Transformer with 3 vertically layed out view panes:

### **Program**

The Program view is where users see and interact with their operations - the building blocks of automation in Transformer. Think of operations as individual steps in your workflow, like "show a message" or "create a file". These operations need to be:

- Organized in a clear hierarchy.
- Easy to run in response to context changes or manually, which itself is a context change
- Tracked so you can see their status
- Displayed in a user-friendly way

To implement this efficiently, we leveraged an existing VSCode system that already handles these exact needs: the testing contribution, contributed at path `src/vs/workbench/contrib/testing`. 	 While this might seem surprising at first, consider the parallels:

- Just as tests are organized in a tree inside the `Testing` explorer viewlet (like "Frontend Tests > Login Tests > Test Valid Password"), operations in Transformer are organized hierarchically
- Just as tests can be run on demand, operations need to be triggered when needed
- Just as tests have states (passing/failing/running), operations have execution states
- Just as tests need a clear UI to display and manage them, operations need a similar interface


What is a bit different is that operations have parameters.  Each operation in the `Program` view can have parameter nodes that define its behavior.  Parameters link to context keys, where state is stored between operations, or other operations in the case of jumps or conditional logic.


This is why Transformer takes VSCode's proven testing infrastructure,and repurposed it:
- The `Testing` viewlet becomes is moved to the `Program` viewpane in the Transformer `Control` viewlet
- "Running a test" becomes "running an operation" or "running the whole program"
- "Test results" become "Program results"
- We can utilize the testing contribution's: 2 "projections", a list or tree projection onto the view, a way for users to see the operations.

These are just examples, there are dozens of ways to utlize the testing contribution.  The mapping is clear and easy to understand and since the testing contribution is designed to be very generic anyway, it works well with Transformer's needs.

The beauty of this approach is that we get a robust, well-tested system for managing our operations, complete with:
- A hierarchical tree view for organizing operations
- Built-in execution tracking
- Status indicators
- Detailed result reporting

For users, none of this technical implementation matters - they simply see a clean, organized view of their operations that they can run, monitor, and manage. The Program view also works seamlessly with the `Operation` view below it, where users can configure the parameters for each operation.


*What are programs?  really...*.

The answer is multiple-choice, all of the above.

- Programs can be thought of as ways for users to build VSCode actions that run across VSCode services and context.
- Programs are event handlers for the DOM
- Programs are widgets to build custom UI
- Programs can demand and  "protocol" needs, demands for parameters, and data/content in a certain shape in order to work with the operation.

In general we want to expose quite a bit of variable surface area in the operations to do a wide range of useful things in the underlying VSCode services, context and UI, the underlying user's computer (accessing their files, their apps, screenshots, voice, and more), and AI with the level of sophistiation, modularity, adaptability found in VSCode.

### **Context**

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

### **View**

The View pane is your program's view.

What is a view?

A view is a very old computer word for a window into the program.   It is a way to interact with the program.

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

# Practical Examples

Let's explore how users can create programs in Transformer, starting with a simple example and moving to a more complex real-world scenario.

## Basic example: Hello World

First, let's create a simple program that shows a message dialog. This example will demonstrate the basic concepts of operations, parameters, and linking.

### Step 1: create a `message` context key

1. Click the + button in the Program view
2. Select "context key add" from the quick pick menu
3. In the `Operation` view, you'll see two parameters:
   - Set `key` to "message"
   - Set `value` to "Hello World!"

### Step 2: show the message in a dialog
1. Click + again in the `Program` view
2. Select "dialog show" from the quick pick menu
3. In the `Operation` view, you'll see:
   - A `text` parameter
   - A `level` parameter (leave as `Info`)
4. Link the dialog `text` parameter to your `message` context key by either:
   - Clicking the link icon next to `text` to activate linking mode.  You should see a special box around the parameter and the interface should have other cues that you are in linking mode.
   - Pressing "=" with the text parameter focused, which also activates linking mode.
   - Once in linking mode, you can select the `message` context key from the context view and push either `Enter` or click the link icon, which has now becomes a `Link` button to complete the link.
   - Alternatively, without entering linking mode , the user can drag the message parameter onto the text parameter, or vice versa, to complete the link.

The Program operation parameters should now indicate the link visually somehow.   Selecting the parameter, should highlight the context key and show the link. Selecting the context key's context menu should reveal a submenu of operations that depend on the context key.

Now when you run your program, it will show "Hello World!" in a VSCode dialog.

## Advanced Example: RFP Response Generator

Let's explore a real-world example: automating RFP (Request for Proposal) responses using Transformer. This example demonstrates how operations and context work together to solve a complex business problem.

### The Business Need

A program manager needs to:
- Streamline RFP response creation
- Leverage past successful responses
- Maintain consistent formatting
- Share the solution with their team
- Use AI to improve response quality

### Building the Program

Let's break this down into clear operations and context building steps:

#### 1. Setup Core Context

```
// Define essential context keys
context key add rfp_content        // Stores the uploaded RFP text
context key add response_library   // Path to successful responses
context key add company_template   // Path to company template
context key add current_sections   // Stores analyzed RFP sections
context key add final_response     // Stores generated response
```

#### 2. Create Upload Interface

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

#### 3. Document Processing

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

#### 4. Response Generation

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

#### 5. Output Interface

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

### Key Context Keys

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

### Making it More Powerful

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

### The Power of Context

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
