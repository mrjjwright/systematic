# Transformer Sheet Extension

This VSCode extension provides Excel spreadsheet functionality to Transformer using SheetJS. It implements the iSheet mutator interface to allow reading and writing Excel files directly within VSCode.

## How it Works

The extension connects VSCode's internal sheet service to Excel files using SheetJS:

```mermaid
graph TD
    subgraph VSCode
        TS[Transformer Sheet Service]
        EXT[Sheet Extension]
    end

    subgraph Extension
        SM[Sheet Mutator]
        SJ[SheetJS]
    end

    subgraph Files
        XL[Excel Workbook]
    end

    TS <--> EXT
    EXT <--> SM
    SM <--> SJ
    SJ <--> XL

    style TS fill:#f9f,stroke:#333,stroke-width:2px
    style EXT fill:#bbf,stroke:#333,stroke-width:2px
    style SM fill:#bfb,stroke:#333,stroke-width:2px
    style SJ fill:#fdb,stroke:#333,stroke-width:2px
    style XL fill:#ddd,stroke:#333,stroke-width:2px
``

## Usage

The extension automatically activates when VSCode starts. It handles:
- Reading Excel cell data
- Writing cell modifications back to the workbook
- Converting between Excel and VSCode sheet formats

## Development

1. Install dependencies: `npm install`
2. Build: `npm run compile`
3. Debug: Launch in VSCode's extension development host
```
