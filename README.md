# Transformer

A fork of VSCode designed for semi professional users to create and share shareable personal programs that run in VSCode.

## Core Concept

Transformer reimagines VS Code as a context-controlled automation platform :

- **Everything revolves around tracking content before process** - content is tracked via git and this opens up content first workflows that scale safely as modern dev shows
- **and context** - A sophisticated reactive structured hierarchy of key/value pairs that determine available operations based on everything from what exact file content is in context, to simple boolean, number and text values, to config to keystokes.
- **Program operations transform content and context** - a group of operations is a program and operations are built to automate VSCode straightforwardly in response to context changes. Operations are run  straightforwardly like an assembly language, setting context keys, changing the vscode ui, talking to AI, opering dialogs, processing input, changing the user's desktop, and more.
- **VSCode native UI** - Transformer is built using ophisticated table views, lists, tables, search, files, tasks and more supplied from vscode.
- **Shareable .trans files** - Programs are saved in *.trans files which drive transformer and are editable in a text file by AI or huamns.  Trans files package context and or operations as reusable sharable files via git or any other means.

## Control and Context

Context changes constantly and must be precisely presented to our minds and intelligent assistants.

Computers process information very straightforwardly in ways that CAN be tracked but are often NOT.

Computers are very fast and therefore can change context and information very fast.

VSCode is good at adaptiing to changing context from your computer at virtually every level, it is not scared of change.

However with Transformer we want to organize change into discrete steps that can be reversed, reverted, backedup, synced, and all the suble things, but we want that for free in some proven form.

That form exists with git which underlies Transformer but it also takes careful programming around files. The techniques and patterns needed for that are within VSCode and reused in Transformer, techniques like working copies, which allows VSCode to never lose your work and you don't have to save your files.

More importantly than that is the ability to track and bisect content with context, computing useful intersecting sets of the 2.

E.g. Imagine a program manager that responds to RFPs a lot and have been experimenting with prompts and techniques that get really high quality results and want to share my workflow with others that she has created for herself.   She thinks it could be a super useful tool across the company but has no formal programming expertise.   The tool she has built presents a simple UI in the Transfomer UI pane. It inolves draggng an RFP (from Word doc e.g) over a view pane that contains a button (where you can also select the file from a dialog).   This kicks off the workflow which ultimately ends in a response.

However what the program manager has discovered is that there are several subtle tricks to make this all work, including a keeping a set of good answers for different categories of answers and letting the AI choose between them.

She has found that Transformer has identified this as a useful patten that is built in that she can pick from.  It involves a sequence of easy operations that she can view in Transformers that run sequentially.

Before we look at the program manager's workflow, let's look at the control viewlet and how it works.

## Control Viewlet

The control viewlet sits in the coveted sidebar position and controls Transformer with 4 vertically layed out view panes:


**Program**

This is implementing by hijacking vscode's testing contribution, which is very generic and powerful way to run our operations at paths in response to context key changes.

In normal vscode, contributions and extensions register code (e.g. actions, view panes, services, and more) once when the contribution runs and might also register some dynamically as things change. VSCode is in general a very dynamic environment.

Transformer lets the user decide when programs run and when each operation in the program runs and when programs call other programs based on simple control flow and the constantly changing values in vscode's context key system.

The goal is to give user's direct control over the control flow of their programs and the values that control them.

Operations run as ITestItem.

Read about the @explainTestService.md here, very required reading

**Operation**

This is just a shorter view pane (height wise) to allow setting params on the current selectly operation (underneath a test in the Test Explorer).   Params such as the text to display in `ui text` or a file to load or something else.

**Context**

The next 2 view panes are outputs of the program.  This first one shows the complete state of the program
Hierarchical treeview for managing context, built entirely around the powerful vscode context key service, which you can read more about here:

@explainContextKey.md

So the context view is just a tree view that shows every piece of state (context keys) relevant to the current program.  Users can see how the tree changes over time by selecting an operation from the Program view pane above and this pane (and the UI pane) should refelect the state up and until tat operation.

**UI**

This a place for operations to present UI to interact with the user. The user can build UI via operations like

"UI Clear" - clears the UI pane
"UI Button" - set a native UI button
"UI Text" - set native text

those operations would go like others in the `Program` view pane yet their effect woudl show up in the UI view pane.  It would show a VSCode ui meaning you can use vscode mechanisms to build UI like tables, buttons, progress views, and tree views and even editors.

The goal is for a central place to present UIs for others to use.


# Design

IN these sections we go deeper into the actual user workflows and design how they would flow into and out of Transformer.

### Hello World

#### Create the `Hello World` program:

1. use the quickpick button "Add Operations" which opens a custom quick pick with just operations like "Context Add"
2.
3. Add a new context key called `message`
4. Set its value to your desired message (e.g., "Hello World!")

#### Create the `UI text` operation

1. Open the `Program` view pane
2. Add a `UI text` action
3. The action will appear as a tree node with a `text` subnode

#### Link context to action:

There are 2 main ways to link the "message" context key to the button's text:

**Drag and Drop Method**:

Find the `message` node in the `Context` view and drag it over the `text` node under the `UI Button` action

or drag the other direction

**Activate Linking Mode**

Linking mode can be activated by typing "=" or selecting the context menu on either node with right click and choosing "Link".


## Program Manager's Workflow



Some of the operations were pretty clear to her, in fact all of them were.  Here is how she had created this.

First she prepped the UI by clearing it with `ui clear`.    All the operations in Transformers start with a noun or some sobject in usual and then you can auto complete with some cool verbs.  It was easy for her to pick the right tests to add from the Quick pick.  She typed `trans ui c` and that is usually all she had to type.

This would bring up the operation she wanted to add to her program and she would tell transformer that she wanted to start with a clear UI.   Then she added the operation	 `ui center` which just means to center what comes next and then `ui file upload button` which put a file upload button in the center of the UI.

Then she added the operation `ui text` which just means to add some text to the UI.  She typed `trans ui t` and that is usually all she had to type.

Everytime she added an item to

She added the text "Drag and drop an RFP here or click to upload" and then added the operation `ui button` which just means to add a button to the UI.  She typed `trans ui b` and that is usually all she had to type.

