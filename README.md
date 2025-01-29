# Transformer

A native VSCode extension for content transformation workflows, designed for semi-technical users who need to combine, transform and process content in repeatable ways.

## Core Concept

Transformer reimagines VSCode's workbench to create a visual programming environment where:

- Content transformations are represented as tree structures
- Each root node represents a sequential step in the workflow
- Child nodes configure their parent step
- Data flows naturally from top to bottom
- Everything runs in native VSCode components

## Key Features

- **Visual Workflows**: Create transformations using familiar tree views instead of code
- **Native Interface**: Built entirely on VSCode's native components - no webviews or custom UI
- **Simple Execution**: Run workflows with a single command, watch progress step by step
- **Deep Integration**: Leverage VSCode's built-in features like Git integration, search, and extension ecosystem

## Core Views

Transformer provides three main view containers:

### 1. Files (Explorer)

- Browse and edit transformation files (.transform)
- Access source content and scripts
- Manage project resources

### 2. Run

- Execute transformation workflows
- Monitor progress
- View outputs and errors
- Debug transformations

### 3. World

- Share transformations with team
- Version control integration
- Access shared resources

## Use Cases

- Combine multiple content sources into standardized formats
- Apply consistent transformations across file sets
- Integrate AI processing steps into content workflows
- Share repeatable workflows across teams
- Track and version content transformation processes

## Examples

A simple text concatenation workflow might look like:

└─ combine-files.transform
├─ 1. Collect Files
│  ├─ Source: data/*.txt
│  └─ Sort: alphabetical
├─ 2. Concatenate
│  ├─ Separator: newline
│  └─ Trim: true
└─ 3. Save
└─ Output: combined.txt

## Architecture

Transformer is built entirely on VSCode's native components and patterns:

- TreeView for workflow representation
- Native commands and menus
- Built-in task system for execution
- Standard extension activation events
- No external dependencies or custom UI components

## Development

This extension follows VSCode's contribution model and best practices:

- Pure TypeScript implementation
- Native VSCode APIs only
- Standard extension structure
- Conventional activation events
- Test-driven development

## Background

Transformer was inspired by the need to create maintainable, shareable content transformation workflows that leverage modern AI and automation while remaining accessible to semi-technical users. It builds on VSCode's mature, battle-tested components to create a powerful yet approachable visual programming environment.
