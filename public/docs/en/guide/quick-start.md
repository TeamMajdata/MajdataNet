# Quick Start

This page explains how to add a new documentation entry.

## Step 1: Add a markdown file

Create a file under a language directory:

```text
public/docs/en/guide/new-topic.md
```

## Step 2: Update navigation structure

Add a node to `_structure.json`:

```json
{
  "title": "New Topic",
  "slug": "guide/new-topic"
}
```

## Step 3: Verify route

Open `/docs/guide/new-topic` and ensure content renders and appears in the sidebar.
