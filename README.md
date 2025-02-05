# Transformer

A fork of VSCode designed for semi professional users to create and share shareable personal programs that run in VSCode.

## Core Concept

Transformer reimagines VS Code as a context-controlled automation platform :

- **Everything revolves around tracking content before process** - content is tracked via git and this opens up content first workflows that scale safely as modern dev shows
- **content is context but context is more than content** - A sophisticated reactive structured hierarchy of key/value pairs that determine available operations based on everything from what exact file content is in context, to simple boolean, number and text values, to config to keystokes, to what ui is shown.
- **Program operations transform content and context** - a group of operations is a program and operations are built to automate VSCode straightforwardly in response to context changes. Operations are run  straightforwardly like an assembly language, setting context keys, changing the vscode ui, talking to AI, opering dialogs, processing input, changing the user's desktop, and more.
- **VSCode native UI** - Transformer is built using sophisticated table views, lists, tables, search, files, tasks and more supplied from vscode.
- **Shareable .trans files** - Programs are saved in *.trans files which drive transformer and are editable in a text file by AI or huamns.  Trans files package context and or operations as reusable sharable files via git or any other means.

## Control and Context

Context changes constantly and must be precisely presented to our minds and intelligent assistants.

Computers process information very straightforwardly in ways that CAN be tracked but are often NOT.

Computers are very fast and therefore can change context and information very fast.

VSCode is good at adaptiing to changing context from your computer at virtually every level, it is not scared of change.

However with Transformer we want to organize change into discrete steps that can be reversed, reverted, backed up, synced, and all the suble things, but we want that for free in some proven form.

That form exists between VSCode and git which both underly Transformer.

One key is the careful programming around files. The techniques and patterns needed for that are within VSCode and reused in Transformer, techniques like working copies, which allows VSCode to never lose your work and you don't have to save your files.

Another key is tracking the content in the files and exchanging them safely with others and branching and merging changes to that content.  This is all brought by git, which cyrpotgraphically hashes and signes the content and tracks it with history and lightweight branching.

And yet another key is that the integration between VSCode and git needs to be good if we are to have a chance of semi proffesionals actually using git to exchange content.

All those things are great but we need some more fundamental features added by VSCode to Transformer.





## Control Viewlet

The control viewlet sits in the coveted sidebar position and controls Transformer with 4 vertically layed out view panes:


**Program**

This is implementing by hijacking vscode's testing contribution, which is very generic and powerful way to run our operations at paths in response to context key changes.

In normal vscode, contributions and extensions register code (e.g. actions, view panes, services, and more) once when the contribution runs and might also register some dynamically as things change. VSCode is in general a very dynamic environment.

Transformer lets the user decide when programs run and when each operation in the program runs and when programs call other programs based on simple control flow and the constantly changing values in vscode's context key system.

The goal is to give user's direct control over the control flow of their programs and the values that control them.

Operations run as ITestItems.

Read about the @explainTestService.md here, very required reading

Note that operations displayed in in the `Program` view pane will have parameter nodes that help to understand the parameters.  They are configured in the `Operation` view pane but can be linked to from the `Program` view pane.

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

Let's go deeper into the actual user workflows and design how they would flow into and out of Transformer.

### Hello World

Let's say we just wanted 2 operations in our program, one which sets a message and the other one which displays the message using the vscode dialog service.

#### Add the `Hello World` message context key

1. use the + button at the top of the `Program` view pane which opens a custom quick pick with just operations like `context key add`
2. a new operation will show up in the `Program` view pane and be selected, you can configure it in the `Operation` view pane.  It will have 2 child nodes for it's parameters, but you edit them in the `Operation` view pane.
3. set the `key` parameter to `message`
4. set the `value` parameter to your desired message e.g., "Hello World!"

#### Add the `dialog show` operation:

1.use the + button at the top of the `Program` view pane which opens a custom quick pick with just operations like `ui text`
2. a new operation will show up in the `Program` view pane and be selected, you can configure it in the `Operation` view pane, and you will see 2 parameters, `text` and `level`
3. leave the `level` dropdown set to `Info` which means you want the dialog service to show an info dialog
4. select the link icon next to the `text` parameter and that will activate linking mode.  Select the first operation, `create context key` and then select the `message` parameter node.  Push enter to complete the link.   You will see a link appear in the `text` parameter.
5. Alernatively you can press `-` while the `text` parameter is focused and that will activate linking mode.
6. Alernatively without entering linking mode you can drag the parameter nodes of either source or target operation onto the other operation's parameter nodes to link them.



### RFP

In this example, we imagine a more complex scenario:

Imagine a program manager that responds to RFPs a lot and have been experimenting with prompts and techniques that get really high quality results and want to share her Transformer program with others.   She thinks it could be a super useful tool across the company but has no formal programming expertise.   The program she has built presents a simple UI in the Transfomer UI pane. It inolves dragging an RFP (from Word doc e.g.) over a view pane that contains a button (where you can also select the file from a dialog).   This kicks off the workflow which ultimately ends in a response.

However what the program manager has discovered is that there are several subtle tricks to make this all work, including a keeping a set of good answers for different categories of answers and letting the AI choose between them.

She has found that Transformer has identified this as a useful patten that is built in that she can pick from.  It involves a sequence of easy operations that she can view in Transformers that run sequentially.

Some of the operations were pretty clear to her, in fact all of them were.  Here is how she had created this.

First she prepped the UI by clearing it with a `ui clear` operation.    All the operations in Transformers start with a noun or some sobject in usual and then you can auto complete with some cool verbs.  It was easy for her to pick the right tests to add from the Quick pick.  She typed `trans ui c` and that is usually all she had to type.

Once she had cleared the ui, first wanted to center everything in the ui.  She added the operation `ui center` which just means to center what comes next and then `ui file upload button` which put a file upload button in the center of the UI.

Then she added the operation `ui text` which just means to add some text to the UI.  She typed `trans ui t`, saw the operation she wanted, and pushed enter.
Using the `Operation` view pane, she changed the `text` parameter to `Drag and drop an RFP here or click to upload`
