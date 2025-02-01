# Transformer

A fork of VSCode designed for semi professional users to create and share shareable personal programs that run in VSCode.

## Core Concept

Transformer reimagines VS Code as a context-controlled automation platform :

- **Everything revolves around tracking content before process** - content is tracked via git and this opens up content first workflows that scale safely as modern dev shows
- **and context** - A sophisticated reactive structured hierarchy of key/value pairs that determine available actions based on everything from what exact file content is in context, to simple boolean, number and text values, to config to keystokes.
- **Actions transform content and context** - actions are built as VSCode actions but are not functions. Functions take in params and produce output. Actions are functions whose params are automatically calculated from context. Actions can be chained in sequences and then controlled via control flow operators in primitive yet strangely effective and powerful ways that resemble assembly language.
- **VSCode native UI** - Sophisticated table views, lists, tables, search, files, tasks and more to control and automate
- **Shareable .trans files** - Package context and or actions as reusable sharable files via git or any other means.

## Control and Context

Context changes constantly and must be precisely presented to our minds and intelligent assistants.

Computers process information very straightforwardly in ways that CAN be tracked but are often NOT.

Computers are very fast and therefore can change context and information very fast.

VSCode is good at adaptiing to changing context from your computer at virtually every level, it is not scared of change.

However with Transformer we want to organize change into discrete steps that can be reversed, reverted, backedup, synced, and all the suble things, but we want that for free in some proven form.

That form exists with git which underlies Transformer but it also takes careful programming around files. The techniques and patterns needed for that are within VSCode and reused in Transformer, techniques like working copies, which allows VSCode to never lose your work and you don't have to save your files.

More importantly than that is the ability to track and bisect content with context, computing useful intersecting sects of the 2.

E.g. when that view is shown and the user has dropped a new file from their computer, then kick off this action and workflow, which I can inspect and modify straightforwardly as well as share as well as revert most of the changes it makes easily, at least the local ones.

## Control Viewlet

The control viewlet sits in the coveted sidebar position and controls Transformer with 3 view panes:

**Context**
Hierarchical treeview for managing context:

- Drag-and-drop files/resources into context tree
- Direct edit key/value pairs with type safety
- Inherit and override values across scopes (maybe by tagging/filtering keys by scopes)
- Integrated with VS Code's context key system
- can be re-loaded and saved to trans files and implements VSCode's `IWorkingCopy` interface so that it is backed up and serialized.

If a context key is active it should show green.

**Actions**

Run actions that are enabled automatically based on context. In normal vscode, contributions and extensions register actions once when the contribution runs and might also register some dynamically as things change. VSCode is in general a very dynamic environment.

Transformer adds actions dynamically and runs them dynamically based on context keys. So that means we can reason about why actions are run and trace and log, actions are only run because at some point a context key (or a combo of them) told them to.

Context keys can be combined in expressions using a language built into vscode, that does NOT require JS.

So the actions panel lights up actions based on what context keys are active and therefore if an action is running or has run it will be green.

**UI**

This a place for actions to present UI to interact with the user. The user can build UI via actions like

"UI Clear" - clears the UI pane
"UI Button" - set a native UI button
"UI Text" - set native text

## Example automation flows

### Hello World

#### Create the `message` context key:

1. Open the `Context` view pane in the `Control` viewlet
1. Add a new context key called `message`
1. Set its value to your desired message (e.g., "Hello World!")

#### Create the `UI text` action

1. Open the `Actions` view pane
1. Add a `UI text` action
1. The action will appear as a tree node with a `text` subnode

#### Link context to action:

There are 2 main ways to link the "message" context key to the button's text:

**Drag and Drop Method**:

Find the `message` node in the `Context` view and drag it over the `text` node under the `UI Button` action

or drag the other direction

**Activate Linking Mode**

Linking mode can be activated by typing "=" or selecting the context menu on either node with right click and choosing "Link".
