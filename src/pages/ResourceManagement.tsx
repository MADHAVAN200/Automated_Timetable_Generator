import { useEffect, useState } from "react";
import { Resource } from "@/types";
import { getAppData, saveResource, deleteResource } from "@/utils/storage";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ResourceForm } from "@/components/ResourceForm";
import { Edit, Trash2, Plus, Building, Beaker } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/use-toast";

const ResourceManagement = () => {
  const [resources, setResources] = useState<Resource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | undefined>(undefined);
  const [deletingResource, setDeletingResource] = useState<Resource | undefined>(undefined);
  const { toast } = useToast();

  useEffect(() => {
    // Load data from Supabase
    const loadData = async () => {
      try {
        setIsLoading(true);
        const data = await getAppData();
        setResources(data.resources);
      } catch (error) {
        console.error("Error loading resource data:", error);
        toast({
          variant: "destructive",
          title: "Error loading data",
          description: "Failed to load resource data from the database."
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [toast]);

  const handleSaveResource = async (resource: Resource) => {
    try {
      await saveResource(resource);
      
      if (editingResource) {
        // Update existing resource in state
        setResources(prev => prev.map(r => r.id === resource.id ? resource : r));
        setEditingResource(undefined);
      } else {
        // Add new resource to state
        setResources(prev => [...prev, resource]);
        setIsAdding(false);
      }
      
      toast({
        title: `Resource ${editingResource ? 'updated' : 'added'}`,
        description: `${resource.name} was successfully ${editingResource ? 'updated' : 'added'}.`
      });
    } catch (error) {
      console.error("Error saving resource:", error);
      toast({
        variant: "destructive",
        title: "Error saving resource",
        description: "Failed to save resource to the database."
      });
    }
  };

  const handleDeleteResource = async (id: string) => {
    try {
      await deleteResource(id);
      setResources(prev => prev.filter(r => r.id !== id));
      setDeletingResource(undefined);
      
      toast({
        title: "Resource deleted",
        description: "Resource was successfully deleted."
      });
    } catch (error) {
      console.error("Error deleting resource:", error);
      toast({
        variant: "destructive",
        title: "Error deleting resource",
        description: "Failed to delete resource from the database."
      });
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Resource Management</h1>
        {!isAdding && !editingResource && (
          <Button onClick={() => setIsAdding(true)}>
            <Plus className="h-4 w-4 mr-2" /> Add Resource
          </Button>
        )}
      </div>

      {isAdding || editingResource ? (
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">
              {editingResource ? "Edit Resource" : "Add New Resource"}
            </h2>
            <Button 
              variant="ghost" 
              onClick={() => {
                setIsAdding(false);
                setEditingResource(undefined);
              }}
            >
              Cancel
            </Button>
          </div>
          <ResourceForm 
            onSave={handleSaveResource} 
            editResource={editingResource}
          />
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {resources.length === 0 ? (
          <div className="col-span-full text-center p-8 border border-dashed rounded-lg">
            <p className="text-muted-foreground mb-4">No resources added yet.</p>
            <Button onClick={() => setIsAdding(true)}>
              <Plus className="h-4 w-4 mr-2" /> Add Your First Resource
            </Button>
          </div>
        ) : (
          resources.map((resource) => (
            <Card key={resource.id}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div className="flex items-center">
                    {resource.type === 'lab' ? (
                      <Beaker className="mr-2 h-5 w-5 text-purple-500" />
                    ) : (
                      <Building className="mr-2 h-5 w-5 text-amber-500" />
                    )}
                    <div>
                      <CardTitle>{resource.name}</CardTitle>
                      <CardDescription>
                        {resource.type === 'lab' ? 'Laboratory' : 'Classroom'}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex space-x-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingResource(resource)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeletingResource(resource)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div>
                  <p className="text-sm">
                    <span className="font-medium">Capacity:</span> {resource.capacity} students
                  </p>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <AlertDialog open={!!deletingResource} onOpenChange={(open) => !open && setDeletingResource(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the resource "{deletingResource?.name}" and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingResource && handleDeleteResource(deletingResource.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ResourceManagement;
