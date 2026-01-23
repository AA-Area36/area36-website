"use client"

import * as React from "react"
import {
  FileText,
  FolderOpen,
  BookOpen,
} from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { ResourceViewer, ResourceItemWithViewer } from "./resource-viewer"
import type { Resource, ResourcesByCategory } from "@/lib/gdrive/types"

interface ResourcesContentProps {
  resources: ResourcesByCategory
}

// Empty state
function EmptyState({ category }: { category: string }) {
  return (
    <div className="text-center py-12">
      <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
      <p className="text-muted-foreground">
        No {category} available at this time.
      </p>
    </div>
  )
}

export function ResourcesContent({ resources }: ResourcesContentProps) {
  const [viewerOpen, setViewerOpen] = React.useState(false)
  const [selectedResource, setSelectedResource] = React.useState<Resource | null>(null)
  const [currentCategory, setCurrentCategory] = React.useState<string>("delegate")

  // Get the current list of resources based on category
  const getCurrentResources = (): Resource[] => {
    switch (currentCategory) {
      case "delegate":
        return resources.delegateReports
      case "area":
        return resources.areaDocuments
      case "forms":
        return resources.forms
      default:
        return []
    }
  }

  const handleView = (resource: Resource, category: string) => {
    setCurrentCategory(category)
    setSelectedResource(resource)
    setViewerOpen(true)
  }

  const handleResourceChange = (resource: Resource) => {
    setSelectedResource(resource)
  }

  return (
    <>
      <Tabs
        defaultValue="delegate"
        className="space-y-8"
        onValueChange={setCurrentCategory}
      >
        <TabsList className="flex-wrap h-auto gap-2">
          <TabsTrigger value="delegate" className="gap-2">
            <FileText className="h-4 w-4" aria-hidden="true" />
            Delegate Reports
            {resources.delegateReports.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {resources.delegateReports.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="area" className="gap-2">
            <FolderOpen className="h-4 w-4" aria-hidden="true" />
            Area Documents
            {resources.areaDocuments.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {resources.areaDocuments.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="forms" className="gap-2">
            <BookOpen className="h-4 w-4" aria-hidden="true" />
            Forms
            {resources.forms.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {resources.forms.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Delegate Reports */}
        <TabsContent value="delegate" className="space-y-4">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-foreground">Delegate Reports</h2>
            <p className="text-muted-foreground mt-1">
              Reports and materials from the General Service Conference.
            </p>
          </div>
          {resources.delegateReports.length === 0 ? (
            <EmptyState category="delegate reports" />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {resources.delegateReports.map((doc) => (
                <ResourceItemWithViewer
                  key={doc.id}
                  resource={doc}
                  icon={FileText}
                  onView={(r) => handleView(r, "delegate")}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Area Documents */}
        <TabsContent value="area" className="space-y-4">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-foreground">Area Documents</h2>
            <p className="text-muted-foreground mt-1">
              Budgets, procedures, handbooks, and other Area materials.
            </p>
          </div>
          {resources.areaDocuments.length === 0 ? (
            <EmptyState category="area documents" />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {resources.areaDocuments.map((doc) => (
                <ResourceItemWithViewer
                  key={doc.id}
                  resource={doc}
                  icon={FolderOpen}
                  onView={(r) => handleView(r, "area")}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Forms */}
        <TabsContent value="forms" className="space-y-4">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-foreground">Forms</h2>
            <p className="text-muted-foreground mt-1">
              Common forms for groups, contributions, and service.
            </p>
          </div>
          {resources.forms.length === 0 ? (
            <EmptyState category="forms" />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {resources.forms.map((form) => (
                <ResourceItemWithViewer
                  key={form.id}
                  resource={form}
                  icon={BookOpen}
                  onView={(r) => handleView(r, "forms")}
                />
              ))}
            </div>
          )}
        </TabsContent>

      </Tabs>

      {/* Resource Viewer Dialog */}
      <ResourceViewer
        resource={selectedResource}
        resources={getCurrentResources()}
        open={viewerOpen}
        onOpenChange={setViewerOpen}
        onResourceChange={handleResourceChange}
      />
    </>
  )
}
