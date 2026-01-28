'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlusCircle, Snowflake, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// This would be stored and managed in a database in a real scenario
const initialConnections = [
  {
    name: 'bigquery_main',
    type: 'bigquery',
    details: 'Default project connection',
  },
];

const connectionSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters').regex(/^[a-z0-9_]+$/, 'Name can only contain lowercase letters, numbers, and underscores.'),
  type: z.enum(['snowflake', 'bigquery']),
  url: z.string().url('Invalid URL format.'),
  user: z.string().min(1, 'User is required.'),
  password: z.string().min(1, 'Password is required.'),
  warehouse: z.string().min(1, 'Warehouse is required.'),
});


export default function ConnectionsPage() {
  const [connections, setConnections] = useState(initialConnections);
  const [isAdding, setIsAdding] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof connectionSchema>>({
    resolver: zodResolver(connectionSchema),
    defaultValues: {
      type: 'snowflake',
    },
  });

  const onSubmit = async (values: z.infer<typeof connectionSchema>) => {
    // In a real application, this would call a server action:
    // await saveTrinoCatalogConfiguration(values);
    // For this example, we'll simulate it client-side.
    
    console.log('Saving connection:', values);
    setConnections(prev => [...prev, {
      name: values.name,
      type: values.type,
      details: `Account: ${new URL(values.url).hostname}`,
    }]);

    toast({
      title: 'Connection Saved',
      description: `The '${values.name}' connection is now available in Trino.`,
    });
    
    form.reset();
    setIsAdding(false);
  };
  
  const handleRemoveConnection = (name: string) => {
    // Cannot remove the default bigquery connection
    if (name === 'bigquery_main') {
        toast({ variant: 'destructive', title: 'Action not allowed', description: 'The default BigQuery connection cannot be removed.'});
        return;
    }
    setConnections(prev => prev.filter(c => c.name !== name));
    toast({
      title: 'Connection Removed',
      description: `Connection '${name}' has been removed.`
    })
  }

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <Card>
        <CardHeader>
          <CardTitle>Data Source Connections</CardTitle>
          <CardDescription>Manage the catalogs Trino can connect to. Changes here will be dynamically loaded by the Trino server.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            {connections.map(conn => (
              <div key={conn.name} className="flex items-center justify-between p-3 bg-muted rounded-md">
                <div className="flex items-center gap-3">
                   <Snowflake className="h-5 w-5 text-blue-400"/>
                   <div>
                    <p className="font-semibold">{conn.name}</p>
                    <p className="text-sm text-muted-foreground">{conn.details}</p>
                   </div>
                </div>
                 <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => handleRemoveConnection(conn.name)}>
                    <Trash2 className="h-4 w-4"/>
                </Button>
              </div>
            ))}
          </div>

          {isAdding ? (
            <Card className="p-6 bg-secondary/50">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <CardTitle className="text-xl mb-4">Add New Snowflake Connection</CardTitle>
                   <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Catalog Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., snowflake_prod" {...field} />
                        </FormControl>
                        <FormDescription>A unique name for this connection in Trino.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Snowflake URL</FormLabel>
                        <FormControl>
                          <Input placeholder="https://your-account.snowflakecomputing.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="user"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>User</FormLabel>
                          <FormControl>
                            <Input placeholder="TRINO_USER" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                     <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input type="password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                   <FormField
                    control={form.control}
                    name="warehouse"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Warehouse</FormLabel>
                        <FormControl>
                          <Input placeholder="TRINO_WAREHOUSE" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="ghost" onClick={() => setIsAdding(false)}>Cancel</Button>
                    <Button type="submit">Save Connection</Button>
                  </div>
                </form>
              </Form>
            </Card>
          ) : (
             <Button onClick={() => setIsAdding(true)}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Connection
            </Button>
          )}

        </CardContent>
      </Card>
    </main>
  );
}
