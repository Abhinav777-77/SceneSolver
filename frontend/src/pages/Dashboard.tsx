
import { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Fingerprint,
  FolderPlus,
  Search,
  FileText,
  Clock,
  Filter,
  ArrowUp,
  ArrowDown,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label as UILabel } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

// Sample case data for initial state
const sampleCases = [];

export default function Dashboard() {
  const [cases, setCases] = useState(sampleCases);
  const [searchQuery, setSearchQuery] = useState("");
  const [newCaseTitle, setNewCaseTitle] = useState("");
  const [newCaseType, setNewCaseType] = useState("");
  const [newCaseDescription, setNewCaseDescription] = useState("");
  const [incidentDate, setIncidentDate] = useState<Date | undefined>(new Date());
  const [sortField, setSortField] = useState("lastUpdated");
  const [sortDirection, setSortDirection] = useState("desc");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { userId: urlUserId } = useParams<{ userId: string }>();

  // Fetch cases on component mount
  useEffect(() => {
    fetchCases();
  }, []);

  // Formdate function 
  
function formatDate(dateObject: any): string {
  const isoDate = dateObject?.$date;
  if (!isoDate) return 'Unknown date';

  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  };
  return new Date(isoDate).toLocaleDateString(undefined, options);
}





  // Function to fetch cases from the backend
  const fetchCases = async () => {
    try {
      setIsLoading(true);
      
      // Get user ID from URL params first, then fallback to session storage or local storage
      const userId = urlUserId || sessionStorage.getItem("userid") || localStorage.getItem("user");
      console.log("User ID:", userId);
      
      if (!userId) {
        throw new Error("User ID not found. Please log in again.");
      }
      
      console.log("Fetching cases for user ID:", userId);
      console.log("Auth token:", sessionStorage.getItem("authToken")?.substring(0, 10) + "...");
      
      // Try with a trailing slash
      const response = await fetch(`http://localhost:5000/api/cases/?user_id=${userId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "x-auth-token": sessionStorage.getItem("authToken") || "",
          "Accept": "application/json",
        },
        credentials: "include",
        mode: "cors"
      });

      console.log("Response status:", response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error response:", errorText);
        throw new Error(`Failed to fetch cases: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log("Cases data received:", data);
      
      // Transform the data to match our frontend format
      const formattedCases = data.map(caseItem => {
        // Extract the ObjectId string from the BSON format
        
        return {
          id: caseItem._id.$oid,
          title: caseItem.title,
          date: formatDate(caseItem.date),
          status: caseItem.status || "Open",
          type: caseItem.case_type || "Unspecified",
          lastUpdated: formatDate(caseItem.last_updated),
        };
      });
      
      console.log("Formatted cases:", formattedCases);
      setCases(formattedCases);
    } catch (error) {
      console.error("Error fetching cases:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load cases. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCase = async () => {
    if (!newCaseTitle) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please provide a title for the case.",
      });
      return;
    }

    try {
      setIsLoading(true);
      
      const response = await fetch("http://localhost:5000/api/cases/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-auth-token": sessionStorage.getItem("authToken") || ""
        },
        body: JSON.stringify({
          user_id: sessionStorage.getItem("userid") || localStorage.getItem("user"),
          title: newCaseTitle,
          type: newCaseType || "Unspecified",
          description: newCaseDescription || "",
          dateofincident: incidentDate ? incidentDate.toISOString() : new Date().toISOString(),
          tags: []
        }),
        credentials: "include"
      });

      if (!response.ok) {
        console.log(response)
        throw new Error("Failed to create case");
      }

      const newCase = await response.json();
      console.log("New case response:", newCase);
      
      // Extract the case ID from the response
      const caseId = newCase.case_id;
      console.log("New case ID:", caseId);
      if (!caseId) {
        console.error("No case ID returned from server");
        throw new Error("Server did not return a case ID");
      }
      
      // Fetch the cases again to get the updated list
      await fetchCases();
      
      // Clear form fields and close dialog
      setNewCaseTitle("");
      setNewCaseType("");
      setNewCaseDescription("");
      setIsDialogOpen(false);

      toast({
        title: "Case Created",
        description: "Your new case has been created successfully.",
      });
      
      // Optionally navigate to the new case
      // navigate(`/case/${formattedCase.id}`);
    } catch (error) {
      console.error("Error creating case:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create case. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      
      <div className="flex-1 container py-8">
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold">Case Dashboard</h1>
            <p className="text-muted-foreground">
              Manage your forensic investigation cases
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search cases..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="flex gap-2 w-full sm:w-auto">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-1">
                    <Filter className="h-4 w-4" />
                    Sort
                    {sortDirection === "asc" ? (
                      <ArrowUp className="h-4 w-4" />
                    ) : (
                      <ArrowDown className="h-4 w-4" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Sort By</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => toggleSort("title")}>
                    Title
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => toggleSort("date")}>
                    Creation Date
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => toggleSort("lastUpdated")}>
                    Last Updated
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => toggleSort("type")}>
                    Case Type
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-1">
                    <FolderPlus className="h-4 w-4" />
                    New Case
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Case</DialogTitle>
                    <DialogDescription>
                      Enter the details for your new investigation case.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="case-title">Case Title</Label>
                      <Input
                        id="case-title"
                        placeholder="Enter case title"
                        value={newCaseTitle}
                        onChange={(e) => setNewCaseTitle(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="case-type">Case Type</Label>
                      <Input
                        id="case-type"
                        placeholder="E.g., Homicide, Robbery, Burglary"
                        value={newCaseType}
                        onChange={(e) => setNewCaseType(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="case-description">Description (Optional)</Label>
                      <Input
                        id="case-description"
                        placeholder="Brief description of the case"
                        value={newCaseDescription}
                        onChange={(e) => setNewCaseDescription(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="incident-date">Date of Incident</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            id="incident-date"
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
                          >
                            <Calendar className="mr-2 h-4 w-4" />
                            {incidentDate ? format(incidentDate, "PPP") : "Select date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <CalendarComponent
                            mode="single"
                            selected={incidentDate}
                            onSelect={setIncidentDate}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateCase}>Create Case</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
          
          {/* Filter cases based on search query */}
          {(() => {
            const filteredCases = cases.filter(c => 
              c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
              c.type.toLowerCase().includes(searchQuery.toLowerCase())
            );
            
            // Sort the filtered cases
            const sortedCases = [...filteredCases].sort((a, b) => {
              const aValue = a[sortField];
              const bValue = b[sortField];
              
              if (sortDirection === "asc") {
                return aValue > bValue ? 1 : -1;
              } else {
                return aValue < bValue ? 1 : -1;
              }
            });
            
            return sortedCases.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="rounded-full bg-muted w-12 h-12 flex items-center justify-center mb-4">
                  <FileText className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="font-medium text-lg mb-1">No cases found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery
                    ? "No cases match your search query"
                    : "Create your first case to get started"}
                </p>
                {!searchQuery && (
                  <Button
                    onClick={() => setIsDialogOpen(true)}
                    variant="outline"
                    className="gap-1"
                  >
                    <FolderPlus className="h-4 w-4" />
                    Create a case
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sortedCases.map((c) => (
                  <Link to={`/case/${c.id}`} key={c.id || `case-${Math.random()}`}>
                    <Card className="h-full transition-shadow hover:shadow-md">
                      <CardHeader>
                        <CardTitle className="flex justify-between items-start">
                          <span className="line-clamp-2">{c.title}</span>
                          <span className="text-xs font-normal px-2 py-1 rounded-full bg-forensic bg-opacity-10 text-forensic">
                            {c.status}
                          </span>
                        </CardTitle>
                        <CardDescription>{c.type}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <FileText className="h-4 w-4 mr-1" />
                          Created on {c.date}
                        </div>
                      </CardContent>
                      <CardFooter className="text-xs text-muted-foreground flex justify-end">
                        <div className="flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          Updated {c.lastUpdated}
                        </div>
                      </CardFooter>
                    </Card>
                  </Link>
                ))}
              </div>
            );
          })()}
        </div>
      </div>
      
      <Footer />
    </div>
  );
}

function Label({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
      {children}
    </label>
  );
}

















