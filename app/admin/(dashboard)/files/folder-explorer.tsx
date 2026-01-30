"use client"

import * as React from "react"
import {
  Folder,
  FolderOpen,
  FileText,
  ChevronRight,
  ChevronDown,
  Lock,
  Pencil,
  Search,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { FolderNode, FileNode, TreeNode } from "./actions"
import { FileMetadataDialog } from "./file-metadata-dialog"

interface FolderExplorerProps {
  folders: FolderNode[]
}

// Check if node or any child matches search
function nodeMatchesSearch(node: TreeNode, search: string): boolean {
  const searchLower = search.toLowerCase()
  
  if (node.type === "file") {
    return (
      node.name.toLowerCase().includes(searchLower) ||
      (node.displayName?.toLowerCase().includes(searchLower) ?? false)
    )
  }

  // For folders, check name and recursively check children
  if (node.name.toLowerCase().includes(searchLower)) {
    return true
  }

  return node.children.some((child) => nodeMatchesSearch(child, search))
}

// Filter tree to only show matching nodes
function filterTree(nodes: TreeNode[], search: string): TreeNode[] {
  if (!search) return nodes

  return nodes
    .filter((node) => nodeMatchesSearch(node, search))
    .map((node) => {
      if (node.type === "file") return node
      return {
        ...node,
        children: filterTree(node.children, search),
      }
    })
}

function FileItem({
  file,
  onEdit,
}: {
  file: FileNode
  onEdit: (file: FileNode) => void
}) {
  return (
    <div className="flex items-center gap-2 py-1.5 px-2 hover:bg-muted/50 rounded-md group">
      <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm truncate">
            {file.displayName || file.name}
          </span>
          {file.hasMetadata && (
            <Badge variant="secondary" className="text-xs px-1.5 py-0">
              Custom
            </Badge>
          )}
          {file.isProtected && (
            <Lock className="h-3 w-3 text-amber-500" />
          )}
        </div>
        {file.displayName && file.displayName !== file.name && (
          <p className="text-xs text-muted-foreground truncate">{file.name}</p>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={() => onEdit(file)}
      >
        <Pencil className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}

function FolderItem({
  folder,
  onEditFile,
  defaultExpanded = false,
  level = 0,
}: {
  folder: FolderNode
  onEditFile: (file: FileNode) => void
  defaultExpanded?: boolean
  level?: number
}) {
  const [expanded, setExpanded] = React.useState(defaultExpanded)

  const hasChildren = folder.children.length > 0
  const filesCount = folder.children.filter((c) => c.type === "file").length
  const foldersCount = folder.children.filter((c) => c.type === "folder").length

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-1 py-1.5 px-2 hover:bg-muted/50 rounded-md cursor-pointer",
          level === 0 && "font-medium"
        )}
        onClick={() => setExpanded(!expanded)}
      >
        {hasChildren ? (
          expanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )
        ) : (
          <span className="w-4" />
        )}
        {expanded ? (
          <FolderOpen className="h-4 w-4 text-primary" />
        ) : (
          <Folder className="h-4 w-4 text-primary" />
        )}
        <span className="text-sm flex-1">{folder.name}</span>
        <span className="text-xs text-muted-foreground">
          {foldersCount > 0 && `${foldersCount} folders`}
          {foldersCount > 0 && filesCount > 0 && ", "}
          {filesCount > 0 && `${filesCount} files`}
        </span>
      </div>

      {expanded && hasChildren && (
        <div className="ml-4 border-l border-border pl-2 mt-1">
          {folder.children.map((child) =>
            child.type === "folder" ? (
              <FolderItem
                key={child.id}
                folder={child}
                onEditFile={onEditFile}
                level={level + 1}
              />
            ) : (
              <FileItem
                key={child.id}
                file={child}
                onEdit={onEditFile}
              />
            )
          )}
        </div>
      )}
    </div>
  )
}

export function FolderExplorer({ folders }: FolderExplorerProps) {
  const [search, setSearch] = React.useState("")
  const [editingFile, setEditingFile] = React.useState<FileNode | null>(null)

  const filteredFolders = React.useMemo(
    () => filterTree(folders, search) as FolderNode[],
    [folders, search]
  )

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search files..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Folder Tree */}
      <div className="border rounded-lg p-4 bg-card max-h-[600px] overflow-y-auto">
        {filteredFolders.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            {search ? "No files match your search" : "No folders configured"}
          </p>
        ) : (
          <div className="space-y-2">
            {filteredFolders.map((folder) => (
              <FolderItem
                key={folder.id}
                folder={folder}
                onEditFile={setEditingFile}
                defaultExpanded={!!search}
              />
            ))}
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <FileMetadataDialog
        file={editingFile}
        open={!!editingFile}
        onOpenChange={(open: boolean) => !open && setEditingFile(null)}
      />
    </div>
  )
}
