# Extract sys_ids from XML
Works in VSCode when opening an exported list of records as XML and using the search & replace feature.

## Search for
```RegEx
<sys_id>\s*([0-9a-fA-F]{32})\s*</sys_id>(\r?\n)?|[\s\S]
```

## Replace with
```RegEx
$1$2
```