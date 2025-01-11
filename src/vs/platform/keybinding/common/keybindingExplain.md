# VS Code Keybinding System

## Core Concept
Think of keybindings like a stack of transparent sheets - when keys are pressed, VS Code looks through the stack from top to bottom to decide which command to run.

## Weight Hierarchy
The weight system determines position in this stack:

| Layer | Weight | Purpose |
|-------|---------|---------|
| Editor Core | 0 | Essential operations (cursor, selection) |
| Editor Contributions | 100 | Built-in editor features |
| Workbench | 200 | UI and window management |
| Built-in Extensions | 300 | Microsoft-provided extensions |
| External Extensions | 400 | Third-party extensions |

## Architecture
The keybinding system connects three parts:
- Input handling (keyboard events)
- Command system (what to execute)
- Context system (when commands are valid)

## Registration
Extensions register keybindings through the `KeybindingsRegistry`. Each binding includes:
- Key combination (e.g. Cmd+P)
- Command to execute
- Weight for precedence
- Optional context conditions

When conflicts occur between same keys, lowest weight wins - ensuring core editor operations stay reliable while allowing customization.
