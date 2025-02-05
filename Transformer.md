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

- **Context Management**: Context goes beyond just file contents - it includes everything from system states to user inputs to program settings. VSCode excels at adapting to changing context at virtually every level of operation.

- **Discrete Operations**: Transformer organizes all changes into discrete, trackable steps. Each step can be:
  - Reversed if something goes wrong
  - Backed up for safety
  - Synced between users
  - Merged when collaborating

The solution to managing this complexity lies in the integration between VSCode and git, which together provide several crucial capabilities:

1. **Smart File Handling**: VSCode's working copy system ensures you never lose work, eliminating the need for manual saving. This system, proven in production use, is leveraged and extended by Transformer.

2. **Content Versioning**: Git provides cryptographic content tracking, enabling:
   - Safe file exchange between users
   - History tracking with branching
   - Secure content signing
   - Lightweight branching and merging

3. **Seamless Integration**: The connection between VSCode and git must be robust and intuitive, especially for semi-professional users who need to exchange content without deep git expertise.

# The Bridge to Users

While these technical capabilities are powerful, their primary value lies in making sophisticated development workflows accessible to semi-professional users - people who need to create and automate workflows but aren't full-time developers. These users require powerful tools but often lack deep technical expertise in areas like git operations and content tracking.

This creates a specific challenge: How do we expose the power of git-based content tracking and VSCode's technical capabilities while making them approachable? The solution needs to:

- Hide technical complexity while preserving functionality
- Provide clear visibility into what's happening
- Make complex operations intuitive
- Maintain all the benefits of our technical implementation

Visual workflows emerge as the natural solution to this challenge. They provide a familiar way to understand and control complex operations without requiring deep technical knowledge. By presenting git operations, content tracking, and automation through a visual interface, we can make these powerful tools accessible while maintaining their sophistication.

A viewlet is the natural choice for this interface because it integrates seamlessly with VSCode's existing patterns, provides persistent visibility of key controls, and allows users to manage complex operations through familiar tree views, panels, and buttons. This approach leverages VSCode's proven UI patterns while creating a dedicated space for Transformer's unique capabilities.

The goal is for semi-professional users to feel empowered, working with coherent, flowing interfaces that make complex operations feel natural and intuitive. By bringing together VSCode's technical capabilities with git's content tracking in an accessible interface, we create a platform where users can focus on their workflows rather than the underlying technology.

## `Control` Viewlet

The `Control` viewlet sits in the coveted sidebar position and controls Transformer with 4 vertically layed out view panes:

### **Program**

The Program view is where users see and interact with their operations - the building blocks of automation in Transformer. Think of operations as individual steps in your workflow, like "show a message" or "create a file". These operations need to be:
- Organized in a clear hierarchy
- Easy to run on demand
- Tracked so you can see their status
- Displayed in a user-friendly way

To implement this efficiently, we leveraged an existing VSCode system that already handles these exact needs: the testing framework. While this might seem surprising at first, consider the parallels:

- Just as tests are organized in a tree (like "Frontend Tests > Login Tests > Test Valid Password"), operations in Transformer are organized hierarchically
- Just as tests can be run on demand, operations need to be triggered when needed
- Just as tests have states (passing/failing/running), operations have execution states
- Just as tests need a clear UI to display and manage them, operations need a similar interface

This is why Transformer adapts VSCode's testing infrastructure, specifically the `ITestItem` interface and `Testing Explorer` UI. We've taken this proven system and repurposed it:
- The "test explorer" becomes our "operation explorer"
- "Running a test" becomes "executing an operation"
- "Test results" become "operation results"

The beauty of this approach is that we get a robust, well-tested system for managing our operations, complete with:
- A hierarchical tree view for organizing operations
- Built-in execution tracking
- Status indicators
- Detailed result reporting

For users, none of this technical implementation matters - they simply see a clean, organized view of their operations that they can run, monitor, and manage. The Program view also works seamlessly with the Operation view below it, where users can configure the parameters for each operation.

Each operation in the Program view can have parameter nodes that define its behavior. While these parameters are configured in the Operation view pane, they can be referenced and linked from the Program view, allowing users to see the relationships between different operations and their settings.

### **Operation**

The Operation view is where you configure how each operation behaves. Think of it as a control panel for customizing the currently selected operation in your program. When you select any operation in the Program view above, this panel shows you all the settings (parameters) that control how that operation will work.

For example:
- A "show message" operation might have parameters for the message text and type (info/warning/error)
- A "file upload" operation might have parameters for allowed file types and upload location
- A "UI text" operation would have parameters for the actual text to display and its formatting

Parameters can be set in two ways:
1. Direct values - typing or selecting a specific value for the parameter
2. Linked values - connecting the parameter to another operation's output, creating a chain of related actions

The Operation view is intentionally compact (shorter than other panes) because you typically only need to focus on a few parameters at a time. It's designed to be:
- Clear and uncluttered, showing only relevant settings for the current operation
- Quick to access, sitting right below the Program view where you select operations
- Flexible enough to handle both simple parameters (like text input) and complex ones (like file selections or dropdown menus)

What makes this view particularly powerful is how it works with the linking system. When you're setting a parameter, you can choose to link it to:
- Results from previous operations
- Context values that change as your program runs
- System values from VSCode itself

This linking capability is what allows you to build complex workflows where operations work together, passing information between them just by connecting their parameters.

### **Context**

The Context view is your window into the "memory" of your program - it shows you exactly what your program knows and tracks at any given moment. Think of it as a living snapshot that updates as your program runs, tracking everything from file contents to user inputs to program settings.

This view is organized as an interactive tree that shows all the key pieces of information (we call these "context keys") that your program is tracking. For example, you might see:
- File-related context: which files are open, their contents, their status
- UI-related context: which buttons are active, what text is displayed
- Program-related context: current step in a workflow, stored values, calculation results
- System-related context: VSCode settings, environment information

What makes this view powerful is that it's both:
- **Historical**: You can select any operation in your program and see exactly what the context looked like at that point
- **Interactive**: You can explore the full tree of information, expanding branches to dig deeper into specific details

The Context view leverages VSCode's built-in context key system, which means it's:
- Fast and reliable (built on proven VSCode technology)
- Automatically updates as your program runs
- Integrates smoothly with other parts of Transformer

For users, this means you can:
1. Debug your programs by seeing exactly what information was available at each step
2. Understand how your operations affect the program's state
3. Verify that your program is tracking the right information
4. Use this information to make your operations smarter and more connected

The Context view works hand-in-hand with the Program and Operation views above it - as you select different operations in the Program view, the Context view updates to show you the state of your program at that exact point in time.

### **UI**

The UI view is your program's visual workspace - a dedicated area where your operations can create interactive interfaces for users. Think of it as a canvas where you can build everything from simple message displays to complex interactive forms, all using familiar VSCode components.

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

## Basic Example: Hello World

First, let's create a simple program that shows a message dialog. This example will demonstrate the basic concepts of operations, parameters, and linking.

### Step 1: Create a Message Operation
1. Click the + button in the Program view
2. Select "context key add" from the quick pick menu
3. In the Operation view, you'll see two parameters:
   - Set "key" to "message"
   - Set "value" to "Hello World!"

### Step 2: Display the Message
1. Click + again in the Program view
2. Select "dialog show" from the quick pick menu
3. In the Operation view, you'll see:
   - A "text" parameter
   - A "level" parameter (leave as "Info")
4. Link the text to your message by either:
   - Clicking the link icon next to "text" and selecting the message
   - Pressing "-" with the text parameter focused
   - Dragging the message parameter onto the text parameter

Now when you run your program, it will show "Hello World!" in a VSCode dialog.

## Advanced Example: RFP Response Generator

Now let's look at a real-world example: a program created by a program manager to automate RFP (Request for Proposal) responses using AI.

### The Business Need
- Program manager frequently responds to RFPs
- Wants to leverage AI for better responses
- Needs to share the solution with colleagues
- Has no formal programming background

### Building the Interface
The program manager created a simple drag-and-drop interface:

1. **Setup the UI**
   ```
   ui clear           // Start with a clean slate
   ui center          // Center all elements
   ui file upload     // Add upload button
   ui text            // Add instructions
   ```

2. **Configure Parameters**
   - Set upload button to accept Word documents
   - Add instruction text: "Drag and drop an RFP here or click to upload"
   - Center everything for clean presentation

### The Workflow
1. User drops an RFP document
2. Program extracts text content
3. AI analyzes the RFP categories
4. Program selects relevant response templates
5. AI generates customized response
6. User reviews and exports final document

### Smart Features
The program manager discovered several optimizations:
- Maintaining a library of successful responses
- Categorizing RFP sections automatically
- Letting AI choose appropriate response templates
- Preserving formatting and company style guides

This example shows how Transformer enables non-technical users to:
- Create sophisticated workflows
- Leverage AI capabilities
- Build user-friendly interfaces
- Share automation solutions

In both examples, note how Transformer's operation-based approach makes it easy to:
- Build programs step by step
- Configure behavior through parameters
- Connect operations through linking
- Create interactive interfaces
- Share solutions with others
