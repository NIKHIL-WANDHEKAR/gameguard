import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Shield, 
  Zap, 
  Code, 
  Github,
  LayoutDashboard, 
  LogOut, 
  Plus, 
  AlertTriangle, 
  CheckCircle, 
  Terminal,
  Play,
  Layers,
  ChevronDown,
  Share2,
  FileText,
  BarChart3,
  Download,
  MessageSquare,
  Wand2,
  Copy,
  UserPlus,
  Menu,
  X
} from "lucide-react";
import { GoogleGenAI } from "@google/genai";
import mermaid from "mermaid";
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts";
import ReactMarkdown from "react-markdown";
import { db, auth, handleFirestoreError, OperationType } from "../firebase";
import { 
  Issue, 
  Scan, 
  Space, 
  Report, 
  GithubFile,
  User,
  Finding 
} from "../types";
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  serverTimestamp,
  limit,
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  setDoc,
  getDocs
} from "firebase/firestore";

const chartData = [
  { name: "Mon", high: 4, medium: 12, low: 24 },
  { name: "Tue", high: 3, medium: 15, low: 20 },
  { name: "Wed", high: 8, medium: 10, low: 30 },
  { name: "Thu", high: 2, medium: 8, low: 18 },
  { name: "Fri", high: 5, medium: 20, low: 25 },
  { name: "Sat", high: 1, medium: 5, low: 10 },
  { name: "Sun", high: 0, medium: 2, low: 5 },
];

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: process.env.VITE_GEMINI_API_KEY });

// Initialize Mermaid
mermaid.initialize({
  startOnLoad: true,
  theme: "dark",
  securityLevel: "loose",
  fontFamily: "Inter, sans-serif",
});

const MermaidDiagram = ({ chart }: { chart: string }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current && chart) {
      const renderDiagram = async () => {
        try {
          // Generate a unique ID for each render to avoid conflicts
          const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
          const { svg } = await mermaid.render(id, chart);
          if (ref.current) {
            ref.current.innerHTML = svg;
          }
        } catch (error) {
          console.error("Mermaid render failed:", error);
          if (ref.current) {
            ref.current.innerHTML = `<div class="text-red-500 text-xs p-4 border border-red-500/20 bg-red-500/5">Failed to render diagram. Please check the syntax.</div>`;
          }
        }
      };
      renderDiagram();
    }
  }, [chart]);

  return <div ref={ref} className="flex justify-center bg-bg-2 p-8 border border-border overflow-auto max-h-[600px]" />;
};

export default function Dashboard({ onLogout }: { onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState<"overview" | "dashboard" | "scans" | "diagram" | "reports" | "chat" | "github" | "settings">("overview");
  const [code, setCode] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [repoFiles, setRepoFiles] = useState<GithubFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<GithubFile | null>(null);
  const [isFetchingRepo, setIsFetchingRepo] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<Issue[] | null>(null);
  const [scans, setScans] = useState<Scan[]>([]);
  
  // Report states
  const [reports, setReports] = useState<Report[]>([]);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  // Chat states
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'ai', text: string}[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);

  // Diagram states
  const [mermaidCode, setMermaidCode] = useState("");
  const [isGeneratingDiagram, setIsGeneratingDiagram] = useState(false);

  // Space states
  const [userData, setUserData] = useState<User | null>(null);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [activeSpace, setActiveSpace] = useState<Space | null>(null);
  const [showSpaceModal, setShowSpaceModal] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState("");
  const [newSpaceDescription, setNewSpaceDescription] = useState("");
  const [isCreatingSpace, setIsCreatingSpace] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member" | "viewer">("member");
  const [isInviting, setIsInviting] = useState(false);
  const [memberProfiles, setMemberProfiles] = useState<Record<string, User>>({});
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const userRoleInSpace = activeSpace?.members?.[auth.currentUser?.uid || ""] || "viewer";
  const canManageMembers = userRoleInSpace === "owner" || userRoleInSpace === "admin";

  const handleInviteMember = async () => {
    if (!inviteEmail.trim() || !activeSpace || !canManageMembers) return;
    setIsInviting(true);
    try {
      // Find user by email
      const usersQuery = query(collection(db, "users"), where("email", "==", inviteEmail.trim().toLowerCase()));
      const userSnapshot = await getDocs(usersQuery);
      
      if (userSnapshot.empty) {
        alert("User not found with this email.");
        return;
      }

      const targetUser = userSnapshot.docs[0].data();
      const targetUserId = targetUser.uid;

      if (activeSpace.members[targetUserId]) {
        alert("User is already a member of this space.");
        return;
      }

      // Update space members
      const spaceRef = doc(db, "spaces", activeSpace.id);
      await updateDoc(spaceRef, {
        [`members.${targetUserId}`]: inviteRole
      });

      // Update target user's spaceIds
      const targetUserRef = doc(db, "users", targetUserId);
      await updateDoc(targetUserRef, {
        spaceIds: arrayUnion(activeSpace.id)
      });

      setInviteEmail("");
      alert(`Successfully invited ${inviteEmail} as ${inviteRole}`);
    } catch (error) {
      console.error("Failed to invite member:", error);
      alert("Failed to invite member.");
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!activeSpace || !canManageMembers || memberId === activeSpace.ownerId) return;
    
    if (!confirm("Are you sure you want to remove this member?")) return;

    try {
      const spaceRef = doc(db, "spaces", activeSpace.id);
      const updatedMembers = { ...activeSpace.members };
      delete updatedMembers[memberId];
      
      await updateDoc(spaceRef, {
        members: updatedMembers
      });

      const userRef = doc(db, "users", memberId);
      await updateDoc(userRef, {
        spaceIds: arrayRemove(activeSpace.id)
      });
    } catch (error) {
      console.error("Failed to remove member:", error);
    }
  };

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    // Fetch user profile to get current space
    const userRef = doc(db, "users", user.uid);
    const unsubscribeUser = onSnapshot(userRef, (snap) => {
      if (snap.exists()) {
        setUserData(snap.data() as User);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
    });

    return () => unsubscribeUser();
  }, [auth.currentUser]);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setSpaces([]);
      setActiveSpace(null);
      return;
    }

    // Fetch all spaces user belongs to by querying the members map
    // This is more resilient than relying on the user's spaceIds list
    const spacesQuery = query(
      collection(db, "spaces"),
      where(`members.${user.uid}`, ">=", "")
    );
    
    const unsubscribeSpaces = onSnapshot(spacesQuery, (spacesSnap) => {
      const spacesList = spacesSnap.docs.map(d => ({
        id: d.id,
        ...d.data()
      })) as Space[];
      setSpaces(spacesList);
      
      // Try to find the current space from the user's profile, fallback to first available
      const currentSpace = spacesList.find(s => s.id === userData?.currentSpaceId) || spacesList[0];
      setActiveSpace(currentSpace || null);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "spaces");
    });

    return () => unsubscribeSpaces();
  }, [auth.currentUser, userData?.currentSpaceId]);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user || !activeSpace) return;

    const q = query(
      collection(db, "scans"),
      where("spaceId", "==", activeSpace.id),
      orderBy("createdAt", "desc"),
      limit(10)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const scanData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        time: doc.data().createdAt?.toDate ? 
          new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: 'numeric' }).format(doc.data().createdAt.toDate()) : 
          'Just now'
      })) as Scan[];
      setScans(scanData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "scans");
    });

    // Fetch reports
    const reportsQuery = query(
      collection(db, "reports"),
      where("spaceId", "==", activeSpace.id),
      orderBy("createdAt", "desc")
    );

    const unsubscribeReports = onSnapshot(reportsQuery, (snapshot) => {
      const reportData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        time: doc.data().createdAt?.toDate ? 
          new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(doc.data().createdAt.toDate()) : 
          'Just now'
      })) as Report[];
      setReports(reportData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "reports");
    });

    return () => {
      unsubscribe();
      unsubscribeReports();
    };
  }, [auth.currentUser, activeSpace]);

  useEffect(() => {
    if (!activeSpace?.members) return;
    const uids = Object.keys(activeSpace.members);
    if (uids.length === 0) {
      setMemberProfiles({});
      return;
    }

    // Fetch user profiles for all members
    // Firestore "in" query is limited to 30 items in recent versions, 10 in older.
    // For spaces, this is usually sufficient.
    const q = query(collection(db, "users"), where("uid", "in", uids));
    const unsubscribe = onSnapshot(q, (snap) => {
      const profiles: Record<string, User> = {};
      snap.docs.forEach(doc => {
        profiles[doc.id] = doc.data() as User;
      });
      setMemberProfiles(profiles);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "users");
    });

    return () => unsubscribe();
  }, [activeSpace?.members]);

  const handleCreateSpace = async () => {
    if (!newSpaceName.trim() || !auth.currentUser) return;
    setIsCreatingSpace(true);
    try {
      const spaceId = `space-${Math.floor(Math.random() * 1000000)}`;
      const spaceRef = doc(db, "spaces", spaceId);
      const newSpace = {
        id: spaceId,
        name: newSpaceName,
        description: newSpaceDescription,
        ownerId: auth.currentUser.uid,
        members: {
          [auth.currentUser.uid]: 'owner'
        },
        createdAt: serverTimestamp()
      };
      
      await setDoc(spaceRef, newSpace);
      
      // Update user's current space
      const userRef = doc(db, "users", auth.currentUser.uid);
      await updateDoc(userRef, {
        currentSpaceId: spaceId,
        spaceIds: arrayUnion(spaceId)
      });
      
      setNewSpaceName("");
      setNewSpaceDescription("");
      setShowSpaceModal(false);
    } catch (error) {
      console.error("Failed to create space:", error);
    } finally {
      setIsCreatingSpace(false);
    }
  };

  const switchSpace = async (spaceId: string) => {
    if (!auth.currentUser) return;
    try {
      const userRef = doc(db, "users", auth.currentUser.uid);
      await updateDoc(userRef, {
        currentSpaceId: spaceId
      });
      setActiveTab("overview");
    } catch (error) {
      console.error("Failed to switch space:", error);
    }
  };

  const handleScan = async () => {
    if (!code.trim() || !auth.currentUser || !activeSpace) return;
    setIsScanning(true);
    setScanResult(null);
    
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Analyze the following code for security vulnerabilities, logic flaws, and best practices. 
        Return a JSON object with:
        1. 'issues': An array of issues, each with 'severity' (high, medium, low), 'type', 'line', 'description', and 'fix' (a suggested code fix snippet).
        2. 'securityScore': A score from 0 to 100 based on the code's security and quality.
        
        Code:
        ${code}`,
        config: {
          responseMimeType: "application/json"
        }
      });
      
      const data = JSON.parse(response.text || "{}");
      const result = data.issues || [];
      const score = data.securityScore || 100;
      
      setScanResult(result);
      
      // Save to Firestore
      await addDoc(collection(db, "scans"), {
        id: `SCAN-${Math.floor(Math.random() * 1000)}`,
        userId: auth.currentUser.uid,
        spaceId: activeSpace.id,
        projectName: "manual-scan",
        code: code,
        status: "completed",
        securityScore: score,
        issuesCount: result.length,
        issues: result,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Scan failed:", error);
      handleFirestoreError(error, OperationType.CREATE, "scans");
    } finally {
      setIsScanning(false);
    }
  };

  const generateDiagram = async () => {
    if (!code.trim()) return;
    setIsGeneratingDiagram(true);
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Analyze the following code and generate a Mermaid.js flowchart or sequence diagram that represents its logical flow. Return ONLY the Mermaid syntax, starting with 'graph TD' or 'sequenceDiagram'. Do not include markdown code blocks.
        
        Code:
        ${code}`,
      });
      
      let text = response.text || "";
      // Clean up potential markdown blocks
      text = text.replace(/```mermaid/g, "").replace(/```/g, "").trim();
      setMermaidCode(text);
      setActiveTab("diagram");
    } catch (error) {
      console.error("Diagram generation failed:", error);
    } finally {
      setIsGeneratingDiagram(false);
    }
  };

  const generateReport = async () => {
    if (!activeSpace || !auth.currentUser) return;
    setIsGeneratingReport(true);
    try {
      // Calculate metrics from recent scans
      const totalScans = scans.length;
      let critical = 0, medium = 0, low = 0, totalScore = 0;
      
      scans.forEach(scan => {
        totalScore += (scan.securityScore || 100);
        scan.issues?.forEach((issue: Issue) => {
          if (issue.severity === 'high') critical++;
          else if (issue.severity === 'medium') medium++;
          else if (issue.severity === 'low') low++;
        });
      });

      const avgScore = totalScans > 0 ? Math.round(totalScore / totalScans) : 100;

      // Generate AI Analysis and Diagram
      const scanContext = scans.map(s => ({
        projectName: s.projectName,
        fileName: s.fileName,
        score: s.securityScore,
        issues: s.issues?.map((i: Issue) => `${i.severity} (${i.type} at line ${i.line}): ${i.description}`).join("; ")
      }));

      const analysisResponse = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Generate a comprehensive security and logic report for the workspace '${activeSpace.name}'. 
        Context: There have been ${totalScans} scans with an average security score of ${avgScore}.
        Issues: ${critical} high, ${medium} medium, and ${low} low severity issues found.
        
        Scan Details:
        ${JSON.stringify(scanContext)}
        
        Return a JSON object with:
        1. 'title': A professional report title.
        2. 'summary': A 3-paragraph analysis of the space's security posture and logical structure.
        3. 'technicalAnalysis': An array of objects for each scan, each with:
           - 'projectName': The project name.
           - 'fileName': The file name.
           - 'summary': A technical summary of the errors found in this specific scan.
           - 'impact': How these specific errors affect the system's security or logic.
           - 'findings': An array of objects for EVERY single issue found in this scan, each with:
             - 'type': The type of issue.
             - 'severity': The severity.
             - 'line': The line number.
             - 'explanation': A detailed explanation of why this is an issue.
             - 'fix': A suggested code fix snippet.
        4. 'diagram': A Mermaid.js graph (graph TD) representing the high-level logical architecture of the projects in this space.
        
        Return ONLY the JSON.`,
        config: { responseMimeType: "application/json" }
      });

      const analysis = JSON.parse(analysisResponse.text || "{}");

      const reportData = {
        id: `REPORT-${Math.floor(Math.random() * 100000)}`,
        spaceId: activeSpace.id,
        userId: auth.currentUser.uid,
        title: analysis.title || `Security Report - ${activeSpace.name}`,
        summary: analysis.summary || "No summary generated.",
        technicalAnalysis: analysis.technicalAnalysis || [],
        metrics: {
          totalScans,
          averageSecurityScore: avgScore,
          criticalIssues: critical,
          mediumIssues: medium,
          lowIssues: low
        },
        diagram: analysis.diagram || "graph TD\n  A[No Data] --> B[No Data]",
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, "reports"), reportData);
      setActiveTab("reports");
    } catch (error) {
      console.error("Report generation failed:", error);
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleChat = async () => {
    if (!chatInput.trim() || !code.trim()) return;
    
    const userMsg: { role: 'user' | 'ai', text: string } = { role: "user", text: chatInput };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput("");
    setIsChatLoading(true);

    try {
      const chat = ai.chats.create({
        model: "gemini-3-flash-preview",
        config: {
          systemInstruction: `You are a security expert. You are discussing the following code with a developer:
          
          Code:
          ${code}`
        }
      });

      const response = await chat.sendMessage({ message: chatInput });
      setChatMessages(prev => [...prev, { role: "ai", text: response.text || "" }]);
    } catch (error) {
      console.error("Chat failed:", error);
    } finally {
      setIsChatLoading(false);
    }
  };

  const fetchGithubRepo = async () => {
    if (!githubUrl.trim()) return;
    setIsFetchingRepo(true);
    setRepoFiles([]);
    setSelectedFile(null);

    try {
      // Basic parsing of github url: https://github.com/owner/repo
      const match = githubUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
      if (!match) {
        alert("Invalid GitHub URL. Please use format: https://github.com/owner/repo");
        return;
      }

      const [, owner, repo] = match;
      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents`);
      if (!response.ok) throw new Error("Failed to fetch repository contents");
      
      const data = await response.json();
      // Filter for code files
      const files = data.filter((item: GithubFile) => 
        item.type === "file" && 
        (item.name.endsWith(".js") || item.name.endsWith(".ts") || item.name.endsWith(".tsx") || item.name.endsWith(".py") || item.name.endsWith(".go"))
      );
      setRepoFiles(files);
    } catch (error) {
      console.error("GitHub fetch failed:", error);
      alert("Failed to fetch repository. Ensure it is public.");
    } finally {
      setIsFetchingRepo(false);
    }
  };

  const scanGithubFile = async (file: GithubFile) => {
    setIsScanning(true);
    setSelectedFile(file);
    setScanResult(null);

    try {
      const response = await fetch(file.download_url);
      if (!response.ok) throw new Error("Failed to download file content");
      const content = await response.text();
      setCode(content); // Sync with editor

      const aiResponse = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Analyze the following code from file '${file.name}' for security vulnerabilities, logic flaws, and best practices. 
        Return a JSON object with:
        1. 'issues': An array of issues, each with 'severity' (high, medium, low), 'type', 'line', 'description', and 'fix' (a suggested code fix snippet).
        2. 'securityScore': A score from 0 to 100 based on the code's security and quality.
        
        Code:
        ${content}`,
        config: {
          responseMimeType: "application/json"
        }
      });

      const data = JSON.parse(aiResponse.text || "{}");
      const result = data.issues || [];
      const score = data.securityScore || 100;
      
      setScanResult(result);

      // Save to Firestore
      if (activeSpace) {
        await addDoc(collection(db, "scans"), {
          id: `GH-${Math.floor(Math.random() * 1000)}`,
          userId: auth.currentUser?.uid,
          spaceId: activeSpace.id,
          projectName: githubUrl.split("/").pop() || "github-repo",
          fileName: file.name,
          code: content,
          status: "completed",
          securityScore: score,
          issuesCount: result.length,
          issues: result,
          createdAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error("GitHub scan failed:", error);
      alert("Failed to scan file.");
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="flex h-screen bg-bg-0 text-txt font-sans overflow-hidden relative">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-bg-0/80 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 border-r border-border flex flex-col bg-bg-1 transform transition-transform duration-300 ease-in-out
        lg:relative lg:translate-x-0
        ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-accent" />
            <span className="font-display font-bold text-xl tracking-tighter">GAMEGUARD</span>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="p-2 lg:hidden hover:bg-bg-2 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 border-b border-border">
          {/* Space Selector */}
          <div className="relative group">
            <button 
              onClick={() => setShowSpaceModal(true)}
              className="w-full flex items-center justify-between p-3 bg-bg-2 border border-border hover:border-accent transition-all text-left"
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <Layers className="w-4 h-4 text-accent shrink-0" />
                <span className="text-xs font-bold uppercase tracking-widest truncate">
                  {activeSpace?.name || "Select Space"}
                </span>
              </div>
              <ChevronDown className="w-3 h-3 opacity-50" />
            </button>
          </div>
        </div>
        
        <nav className="flex-1 flex flex-col gap-2 p-6 overflow-y-auto">
          {[
            { id: "overview" as const, icon: LayoutDashboard, label: "Overview" },
            { id: "scans" as const, icon: Zap, label: "Manual Scan" },
            { id: "github" as const, icon: Github, label: "GitHub Scan" },
            { id: "diagram" as const, icon: Share2, label: "Code Diagram" },
            { id: "reports" as const, icon: FileText, label: "Reports" }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setIsSidebarOpen(false);
              }}
              className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all ${
                activeTab === item.id 
                  ? "bg-accent text-bg-0" 
                  : "text-txt-muted hover:text-txt hover:bg-bg-2"
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </nav>
        
        <button 
          onClick={onLogout}
          className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-txt-muted hover:text-red-500 transition-colors mt-auto"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden w-full">
        {/* Header */}
        <header className="h-16 border-b border-border flex items-center justify-between px-4 md:px-8 bg-bg-1 shrink-0">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 lg:hidden hover:bg-bg-2 transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="font-display font-bold text-base md:text-lg uppercase tracking-tight truncate">
              {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
            </h2>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-bg-2 border border-border rounded-full">
              <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span className="text-[10px] font-mono text-accent uppercase tracking-widest">Guard Core Online</span>
            </div>
            <button className="p-2 hover:bg-bg-2 transition-colors">
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Space Management Modal */}
        <AnimatePresence>
          {showSpaceModal && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowSpaceModal(false)}
                className="absolute inset-0 bg-bg-0/90 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative w-full max-w-lg bg-bg-1 border border-border p-8 shadow-2xl"
              >
                <div className="flex items-center justify-between mb-8">
                  <h3 className="font-display font-bold text-xl uppercase tracking-tight">Spaces</h3>
                  <button onClick={() => setShowSpaceModal(false)} className="p-2 hover:bg-bg-2">
                    <LogOut className="w-4 h-4 rotate-180" />
                  </button>
                </div>

                <div className="flex flex-col gap-6">
                  <div className="flex flex-col gap-4">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest opacity-50">Switch Space</h4>
                    <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-2">
                      {spaces.map((space) => (
                        <button
                          key={space.id}
                          onClick={() => {
                            switchSpace(space.id);
                            setShowSpaceModal(false);
                          }}
                          className={`flex items-center justify-between p-4 border transition-all ${
                            activeSpace?.id === space.id 
                              ? "border-accent bg-bg-2" 
                              : "border-border hover:border-accent/50 bg-bg-0"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Layers className={`w-4 h-4 ${activeSpace?.id === space.id ? "text-accent" : "opacity-50"}`} />
                            <div className="text-left">
                              <div className="text-xs font-bold uppercase tracking-tight">{space.name}</div>
                              <div className="text-[10px] opacity-50">{Object.keys(space.members || {}).length} members</div>
                            </div>
                          </div>
                          {activeSpace?.id === space.id && <CheckCircle className="w-4 h-4 text-accent" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-6 border-t border-border">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-4">Space Members</h4>
                    <div className="flex flex-col gap-4">
                      {activeSpace && (
                        <div className="flex flex-col gap-2 max-h-40 overflow-y-auto pr-2">
                          {Object.entries(activeSpace.members).map(([uid, role]) => (
                            <div key={uid} className="flex items-center justify-between p-3 bg-bg-0 border border-border">
                              <div className="flex flex-col">
                                <span className="text-xs font-bold uppercase tracking-tight">
                                  {memberProfiles[uid]?.displayName || memberProfiles[uid]?.email || `User ${uid.slice(0, 4)}`}
                                </span>
                                <span className="text-[10px] font-mono opacity-50">{role}</span>
                              </div>
                              {canManageMembers && uid !== auth.currentUser?.uid && uid !== activeSpace.ownerId && (
                                <button 
                                  onClick={() => handleRemoveMember(uid)}
                                  className="text-[10px] text-red-500 hover:underline uppercase font-bold"
                                >
                                  Remove
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {canManageMembers && (
                        <div className="flex flex-col gap-3 pt-4 border-t border-border">
                          <h5 className="text-[9px] font-bold uppercase tracking-widest opacity-50">Invite Member</h5>
                          <div className="flex gap-2">
                            <input
                              type="email"
                              value={inviteEmail}
                              onChange={(e) => setInviteEmail(e.target.value)}
                              placeholder="User Email"
                              className="flex-1 bg-bg-0 border border-border px-3 py-2 text-xs font-mono focus:outline-none focus:border-accent"
                            />
                            <select
                              value={inviteRole}
                              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setInviteRole(e.target.value as "admin" | "member" | "viewer")}
                              className="bg-bg-0 border border-border px-2 py-2 text-xs font-mono focus:outline-none focus:border-accent"
                            >
                              <option value="admin">Admin</option>
                              <option value="member">Member</option>
                              <option value="viewer">Viewer</option>
                            </select>
                            <button
                              onClick={handleInviteMember}
                              disabled={isInviting || !inviteEmail.trim()}
                              className="p-2 bg-accent text-bg-0 hover:bg-white transition-all disabled:opacity-50"
                            >
                              <UserPlus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-6 border-t border-border">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-4">Create New Space</h4>
                    <div className="flex flex-col gap-4">
                      <input
                        type="text"
                        value={newSpaceName}
                        onChange={(e) => setNewSpaceName(e.target.value)}
                        placeholder="Space Name"
                        className="w-full bg-bg-0 border border-border px-4 py-3 text-sm focus:outline-none focus:border-accent"
                      />
                      <input
                        type="text"
                        value={newSpaceDescription}
                        onChange={(e) => setNewSpaceDescription(e.target.value)}
                        placeholder="Description (Optional)"
                        className="w-full bg-bg-0 border border-border px-4 py-3 text-sm focus:outline-none focus:border-accent"
                      />
                      <button
                        onClick={handleCreateSpace}
                        disabled={isCreatingSpace || !newSpaceName.trim()}
                        className="w-full py-4 bg-accent text-bg-0 font-bold text-xs uppercase tracking-widest hover:bg-white transition-all disabled:opacity-50"
                      >
                        {isCreatingSpace ? "Creating..." : "Create Space"}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          {activeTab === "overview" && (
            <div className="flex flex-col gap-6 md:gap-8">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                {[
                  { 
                    label: "Avg Security Score", 
                    value: scans.length > 0 ? `${Math.round(scans.reduce((acc, s) => acc + (s.securityScore || 100), 0) / scans.length)}/100` : "100/100", 
                    icon: Shield, 
                    color: "text-emerald-500" 
                  },
                  { 
                    label: "Total Scans", 
                    value: scans.length.toLocaleString(), 
                    icon: Zap, 
                    color: "text-accent" 
                  },
                  { 
                    label: "Critical Issues", 
                    value: scans.reduce((acc, s) => acc + (s.issues?.filter((i: Issue) => i.severity === 'high').length || 0), 0), 
                    icon: AlertTriangle, 
                    color: "text-red-500" 
                  },
                  { 
                    label: "Reports Generated", 
                    value: reports.length, 
                    icon: FileText, 
                    color: "text-blue-500" 
                  }
                ].map((stat, i) => (
                  <div key={i} className="p-6 border border-border bg-bg-1 hover:border-accent transition-colors">
                    <div className="flex items-center justify-between mb-4">
                      <stat.icon className={`w-5 h-5 ${stat.color}`} />
                      <span className="meta-label">Space: {activeSpace?.name}</span>
                    </div>
                    <div className="text-3xl font-display font-bold">{stat.value}</div>
                    <div className="meta-label mt-2">{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Vulnerability Trend Chart */}
              <div className="p-8 border border-border bg-bg-1">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="font-display font-bold uppercase tracking-tight">Vulnerability Trend</h3>
                    <p className="text-xs text-txt-muted mt-1">AI-predicted risk factors for the next 7 days</p>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-red-500" />
                      <span className="text-[10px] uppercase tracking-widest opacity-50">High</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-yellow-500" />
                      <span className="text-[10px] uppercase tracking-widest opacity-50">Medium</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500" />
                      <span className="text-[10px] uppercase tracking-widest opacity-50">Low</span>
                    </div>
                  </div>
                </div>
                
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorHigh" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                      <XAxis 
                        dataKey="name" 
                        stroke="#444" 
                        fontSize={10} 
                        tickLine={false} 
                        axisLine={false}
                        tick={{ fill: '#888' }}
                      />
                      <YAxis 
                        stroke="#444" 
                        fontSize={10} 
                        tickLine={false} 
                        axisLine={false}
                        tick={{ fill: '#888' }}
                      />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#111', border: '1px solid #222', fontSize: '12px' }}
                        itemStyle={{ color: '#fff' }}
                      />
                      <Area type="monotone" dataKey="high" stroke="#ef4444" fillOpacity={1} fill="url(#colorHigh)" strokeWidth={2} />
                      <Area type="monotone" dataKey="medium" stroke="#eab308" fill="transparent" strokeWidth={2} />
                      <Area type="monotone" dataKey="low" stroke="#3b82f6" fill="transparent" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Recent Scans - Recipe 1 */}

              <div className="border border-border bg-bg-1">
                <div className="p-6 border-b border-border flex items-center justify-between">
                  <h3 className="font-display font-bold uppercase tracking-tight">Recent Scans</h3>
                  <button className="text-xs font-mono text-accent hover:underline">View All</button>
                </div>
                
                <div className="overflow-x-auto">
                  <div className="min-w-[600px]">
                    <div className="data-row bg-bg-2">
                      <div className="col-header">ID</div>
                      <div className="col-header">Source</div>
                      <div className="col-header">Status</div>
                      <div className="col-header">Issues</div>
                      <div className="col-header">Time</div>
                    </div>
                    
                    {scans.map((scan) => (
                      <div key={scan.id} className="data-row">
                        <div className="data-value text-xs opacity-50">{scan.id.slice(0, 8)}</div>
                        <div className="font-medium">{scan.projectName}</div>
                        <div className="flex items-center gap-2">
                          {scan.status === "completed" ? (
                            <CheckCircle className="w-3 h-3 text-accent" />
                          ) : (
                            <AlertTriangle className="w-3 h-3 text-red-500" />
                          )}
                          <span className={`text-[10px] uppercase tracking-widest ${
                            scan.status === "completed" ? "text-accent" : "text-red-500"
                          }`}>
                            {scan.status}
                          </span>
                        </div>
                        <div className="data-value">{scan.issuesCount}</div>
                        <div className="text-xs text-txt-muted">{scan.time}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "scans" && (
            <div className="flex flex-col gap-8">
              <div className="p-8 border border-border bg-bg-1">
                <div className="flex items-center gap-2 mb-6">
                  <Terminal className="w-5 h-5 text-accent" />
                  <h3 className="font-display font-bold uppercase tracking-tight">Manual Analysis</h3>
                </div>
                
                <textarea
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Paste your code here for AI-powered analysis..."
                  className="w-full h-64 bg-bg-0 border border-border p-4 font-mono text-sm text-accent focus:outline-none focus:border-accent transition-colors resize-none mb-6"
                />
                
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <button
                    onClick={handleScan}
                    disabled={isScanning || !code.trim()}
                    className="flex items-center justify-center gap-3 px-6 md:px-8 py-4 bg-accent text-bg-0 font-bold text-sm uppercase tracking-widest hover:bg-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isScanning ? (
                      <div className="w-4 h-4 border-2 border-bg-0 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                    {isScanning ? "Analyzing..." : "Run Analysis"}
                  </button>

                  <button
                    onClick={() => setIsChatOpen(!isChatOpen)}
                    disabled={!code.trim()}
                    className="flex items-center justify-center gap-3 px-6 md:px-8 py-4 border border-border text-txt font-bold text-sm uppercase tracking-widest hover:bg-bg-2 transition-all disabled:opacity-50"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Consult AI
                  </button>

                  <button
                    onClick={generateDiagram}
                    disabled={isGeneratingDiagram || !code.trim()}
                    className="flex items-center justify-center gap-3 px-6 md:px-8 py-4 border border-accent text-accent font-bold text-sm uppercase tracking-widest hover:bg-accent hover:text-bg-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isGeneratingDiagram ? (
                      <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Share2 className="w-4 h-4" />
                    )}
                    {isGeneratingDiagram ? "Generating..." : "Plot Diagram"}
                  </button>
                </div>
              </div>

              {scanResult && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col gap-4"
                >
                  <h3 className="font-display font-bold uppercase tracking-tight">Analysis Results</h3>
                  <div className="grid grid-cols-1 gap-4">
                    {scanResult.map((issue: Issue, i: number) => (
                      <div key={i} className="p-6 border border-border bg-bg-1 flex items-start gap-4">
                        <div className={`mt-1 ${
                          issue.severity === "high" ? "text-red-500" : 
                          issue.severity === "medium" ? "text-yellow-500" : "text-blue-500"
                        }`}>
                          <AlertTriangle className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 border ${
                              issue.severity === "high" ? "border-red-500 text-red-500" : 
                              issue.severity === "medium" ? "border-yellow-500 text-yellow-500" : "border-blue-500 text-blue-500"
                            }`}>
                              {issue.severity}
                            </span>
                            <span className="text-xs font-mono opacity-50">Line {issue.line}</span>
                            <span className="text-xs font-bold uppercase tracking-tight">{issue.type}</span>
                          </div>
                          <div className="markdown-body mb-4">
                            <ReactMarkdown>{issue.description}</ReactMarkdown>
                          </div>
                          
                          {issue.fix && (
                            <div className="bg-bg-0 border border-border p-4">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-[9px] font-bold uppercase tracking-widest text-accent">AI Suggested Fix</span>
                                <button 
                                  onClick={() => {
                                    navigator.clipboard.writeText(issue.fix);
                                    alert("Fix copied to clipboard!");
                                  }}
                                  className="p-1 hover:bg-bg-2 transition-colors flex items-center gap-1"
                                >
                                  <Copy className="w-3 h-3 opacity-50" />
                                  <span className="text-[8px] uppercase tracking-widest opacity-50">Copy</span>
                                </button>
                              </div>
                              <pre className="text-xs font-mono text-emerald-500 overflow-x-auto p-2 bg-bg-2 border border-border">
                                {issue.fix}
                              </pre>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>
          )}

          {activeTab === "diagram" && (
            <div className="flex flex-col gap-8">
              <div className="p-8 border border-border bg-bg-1">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-2">
                    <Share2 className="w-5 h-5 text-accent" />
                    <h3 className="font-display font-bold uppercase tracking-tight">Logical Code Diagram</h3>
                  </div>
                  <button 
                    onClick={generateDiagram}
                    className="text-[10px] font-bold uppercase tracking-widest text-accent hover:underline"
                  >
                    Regenerate
                  </button>
                </div>

                {mermaidCode ? (
                  <div className="flex flex-col gap-6">
                    <MermaidDiagram chart={mermaidCode} />
                    
                    <div className="p-6 border border-border bg-bg-0">
                      <h4 className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-4">Mermaid Source</h4>
                      <pre className="text-xs font-mono text-txt-muted overflow-x-auto p-4 bg-bg-2 border border-border">
                        {mermaidCode}
                      </pre>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-20 border border-dashed border-border bg-bg-0 gap-4">
                    <Code className="w-8 h-8 opacity-20" />
                    <p className="text-xs font-mono uppercase tracking-widest opacity-50">No diagram generated yet</p>
                    <button 
                      onClick={() => setActiveTab("scans")}
                      className="text-xs font-bold uppercase tracking-widest text-accent hover:underline"
                    >
                      Go to Manual Scan to generate
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "reports" && (
            <div className="flex flex-col gap-8">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display font-bold uppercase tracking-tight">Space Reports</h3>
                  <p className="text-xs text-txt-muted mt-1">Comprehensive analysis and metrics for {activeSpace?.name}</p>
                </div>
                <button
                  onClick={generateReport}
                  disabled={isGeneratingReport}
                  className="flex items-center gap-2 px-6 py-3 bg-accent text-bg-0 font-bold text-xs uppercase tracking-widest hover:bg-white transition-all disabled:opacity-50"
                >
                  {isGeneratingReport ? (
                    <div className="w-3 h-3 border-2 border-bg-0 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <BarChart3 className="w-4 h-4" />
                  )}
                  {isGeneratingReport ? "Generating..." : "Generate New Report"}
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Reports List */}
                <div className="lg:col-span-1 flex flex-col gap-4">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest opacity-50">History</h4>
                  {reports.length > 0 ? (
                    reports.map((report) => (
                      <button
                        key={report.id}
                        onClick={() => setSelectedReport(report)}
                        className={`p-6 border text-left transition-all ${
                          selectedReport?.id === report.id 
                            ? "border-accent bg-bg-2" 
                            : "border-border hover:border-accent/50 bg-bg-1"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className={`w-4 h-4 ${selectedReport?.id === report.id ? "text-accent" : "opacity-50"}`} />
                          <span className="text-xs font-bold truncate">{report.title}</span>
                        </div>
                        <div className="text-[10px] text-txt-muted uppercase tracking-widest">
                          {report.time}
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="p-12 border border-dashed border-border text-center opacity-50 text-xs">
                      No reports generated yet.
                    </div>
                  )}
                </div>

                {/* Report Detail */}
                <div className="lg:col-span-2">
                  {selectedReport ? (
                    <motion.div 
                      key={selectedReport.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="p-8 border border-border bg-bg-1 flex flex-col gap-8"
                    >
                      <div className="flex items-center justify-between border-b border-border pb-6">
                        <h3 className="font-display font-bold text-2xl uppercase tracking-tight">{selectedReport.title}</h3>
                        <button className="p-2 hover:bg-bg-2 border border-border">
                          <Download className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Metrics Row */}
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        {[
                          { label: "Security Score", value: `${selectedReport.metrics.averageSecurityScore}/100`, color: "text-emerald-500" },
                          { label: "Total Scans", value: selectedReport.metrics.totalScans, color: "text-accent" },
                          { label: "Critical", value: selectedReport.metrics.criticalIssues, color: "text-red-500" },
                          { label: "Medium", value: selectedReport.metrics.mediumIssues, color: "text-yellow-500" },
                          { label: "Low", value: selectedReport.metrics.lowIssues, color: "text-blue-500" }
                        ].map((m, i) => (
                          <div key={i} className="p-4 bg-bg-2 border border-border">
                            <div className={`text-xl font-display font-bold ${m.color}`}>{m.value}</div>
                            <div className="text-[10px] uppercase tracking-widest opacity-50 mt-1">{m.label}</div>
                          </div>
                        ))}
                      </div>

                      {/* Analysis Summary */}
                      <div className="flex flex-col gap-4">
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-accent">AI Analysis Summary</h4>
                        <div className="markdown-body">
                          <ReactMarkdown>{selectedReport.summary}</ReactMarkdown>
                        </div>
                      </div>

                      {/* Technical Analysis Per Scan */}
                      <div className="flex flex-col gap-6">
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-accent">Technical Scan Analysis</h4>
                        <div className="grid grid-cols-1 gap-6">
                          {selectedReport.technicalAnalysis?.map((analysis, idx: number) => (
                            <div key={idx} className="p-6 border border-border bg-bg-2 flex flex-col gap-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Terminal className="w-4 h-4 text-accent" />
                                  <span className="text-xs font-bold uppercase tracking-tight">{analysis.projectName}</span>
                                </div>
                                <span className="text-[10px] font-mono opacity-50">{analysis.fileName}</span>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                  <h5 className="text-[9px] font-bold uppercase tracking-widest opacity-50 mb-2">Technical Summary</h5>
                                  <div className="markdown-body">
                                    <ReactMarkdown>{analysis.summary}</ReactMarkdown>
                                  </div>
                                </div>
                                <div>
                                  <h5 className="text-[9px] font-bold uppercase tracking-widest opacity-50 mb-2">Impact Analysis</h5>
                                  <div className="markdown-body">
                                    <ReactMarkdown>{analysis.impact}</ReactMarkdown>
                                  </div>
                                </div>
                              </div>

                              {/* Detailed Findings */}
                              <div className="mt-4 border-t border-border pt-4">
                                <h5 className="text-[9px] font-bold uppercase tracking-widest opacity-50 mb-4">Detailed Findings & Explanations</h5>
                                <div className="flex flex-col gap-3">
                                  {analysis.findings?.map((finding: Finding, fIdx: number) => (
                                    <div key={fIdx} className="p-4 bg-bg-0 border border-border">
                                      <div className="flex items-center gap-3 mb-2">
                                        <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 border ${
                                          finding.severity === "high" ? "border-red-500 text-red-500" : 
                                          finding.severity === "medium" ? "border-yellow-500 text-yellow-500" : "border-blue-500 text-blue-500"
                                        }`}>
                                          {finding.severity}
                                        </span>
                                        <span className="text-[10px] font-mono opacity-50">Line {finding.line}</span>
                                        <span className="text-[10px] font-bold uppercase tracking-tight">{finding.type}</span>
                                      </div>
                                      <div className="markdown-body mb-3">
                                        <ReactMarkdown>{finding.explanation}</ReactMarkdown>
                                      </div>
                                      {finding.fix && (
                                        <div className="bg-bg-2 p-3 border border-border">
                                          <div className="text-[8px] font-bold uppercase tracking-widest opacity-50 mb-1">Suggested Fix</div>
                                          <pre className="text-[10px] font-mono text-emerald-500 overflow-x-auto">{finding.fix}</pre>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Logical Diagram */}
                      <div className="flex flex-col gap-4">
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-accent">Logical Architecture Diagram</h4>
                        <MermaidDiagram chart={selectedReport.diagram} />
                      </div>
                    </motion.div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center p-20 border border-dashed border-border bg-bg-1 opacity-50 gap-4">
                      <BarChart3 className="w-12 h-12" />
                      <p className="text-xs font-mono uppercase tracking-widest">Select a report to view details</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "github" && (
            <div className="flex flex-col gap-8">
              <div className="p-8 border border-border bg-bg-1">
                <div className="flex items-center gap-2 mb-6">
                  <Github className="w-5 h-5 text-accent" />
                  <h3 className="font-display font-bold uppercase tracking-tight">GitHub Repository Scan</h3>
                </div>
                
                <div className="flex gap-4 mb-8">
                  <input
                    type="text"
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    placeholder="https://github.com/owner/repo"
                    className="flex-1 bg-bg-0 border border-border px-4 py-3 font-mono text-sm text-accent focus:outline-none focus:border-accent transition-colors"
                  />
                  <button
                    onClick={fetchGithubRepo}
                    disabled={isFetchingRepo || !githubUrl.trim()}
                    className="px-8 py-3 bg-accent text-bg-0 font-bold text-xs uppercase tracking-widest hover:bg-white transition-all disabled:opacity-50"
                  >
                    {isFetchingRepo ? "Fetching..." : "Connect Repo"}
                  </button>
                </div>

                {repoFiles.length > 0 && (
                  <div className="flex flex-col gap-4">
                    <h4 className="text-xs font-mono uppercase tracking-widest opacity-50">Select a file to scan:</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {repoFiles.map((file) => (
                        <button
                          key={file.path}
                          onClick={() => scanGithubFile(file)}
                          disabled={isScanning}
                          className={`p-4 border text-left transition-all ${
                            selectedFile?.path === file.path 
                              ? "border-accent bg-bg-2" 
                              : "border-border hover:border-accent/50 bg-bg-0"
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <Code className="w-3 h-3 text-accent" />
                            <span className="text-xs font-bold truncate">{file.name}</span>
                          </div>
                          <div className="text-[10px] text-txt-muted uppercase tracking-widest">
                            {file.size} bytes
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {isScanning && (
                <div className="flex flex-col items-center justify-center p-12 border border-border bg-bg-1 gap-4">
                  <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs font-mono uppercase tracking-widest animate-pulse">Scanning {selectedFile?.name}...</p>
                </div>
              )}

              {scanResult && !isScanning && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col gap-4"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-display font-bold uppercase tracking-tight">Results for {selectedFile?.name}</h3>
                    <div className="flex gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 border border-accent text-accent">
                        {scanResult.length} Issues Found
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    {scanResult.map((issue: Issue, i: number) => (
                      <div key={i} className="p-6 border border-border bg-bg-1 flex items-start gap-4">
                        <div className={`mt-1 ${
                          issue.severity === "high" ? "text-red-500" : 
                          issue.severity === "medium" ? "text-yellow-500" : "text-blue-500"
                        }`}>
                          <AlertTriangle className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 border ${
                              issue.severity === "high" ? "border-red-500 text-red-500" : 
                              issue.severity === "medium" ? "border-yellow-500 text-yellow-500" : "border-blue-500 text-blue-500"
                            }`}>
                              {issue.severity}
                            </span>
                            <span className="text-xs font-mono opacity-50">Line {issue.line}</span>
                            <span className="text-xs font-bold uppercase tracking-tight">{issue.type}</span>
                          </div>
                          <p className="text-sm text-txt-muted leading-relaxed">{issue.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* AI Chat Sidebar */}
      <AnimatePresence>
        {isChatOpen && (
          <motion.aside
            initial={{ x: 400 }}
            animate={{ x: 0 }}
            exit={{ x: 400 }}
            className="w-96 border-l border-border bg-bg-1 flex flex-col shadow-2xl"
          >
            <div className="p-6 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-accent" />
                <span className="font-display font-bold uppercase tracking-tight">Security Consultant</span>
              </div>
              <button onClick={() => setIsChatOpen(false)} className="p-2 hover:bg-bg-2">
                <Plus className="w-4 h-4 rotate-45" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
              {chatMessages.length === 0 && (
                <div className="text-center py-12 opacity-50">
                  <Wand2 className="w-8 h-8 mx-auto mb-4" />
                  <p className="text-xs uppercase tracking-widest">Ask me anything about the current code</p>
                </div>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`max-w-[90%] p-4 ${
                    msg.role === 'user' 
                      ? 'bg-accent text-bg-0 text-xs font-bold' 
                      : 'bg-bg-2 border border-border markdown-body'
                  }`}>
                    {msg.role === 'user' ? (
                      msg.text
                    ) : (
                      <ReactMarkdown>{msg.text}</ReactMarkdown>
                    )}
                  </div>
                </div>
              ))}
              {isChatLoading && (
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest opacity-50">
                  <div className="w-1 h-1 bg-accent rounded-full animate-bounce" />
                  <div className="w-1 h-1 bg-accent rounded-full animate-bounce [animation-delay:0.2s]" />
                  <div className="w-1 h-1 bg-accent rounded-full animate-bounce [animation-delay:0.4s]" />
                  Thinking...
                </div>
              )}
            </div>

            <div className="p-6 border-t border-border">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleChat()}
                  placeholder="Ask a question..."
                  className="flex-1 bg-bg-0 border border-border px-4 py-2 text-xs focus:outline-none focus:border-accent"
                />
                <button 
                  onClick={handleChat}
                  className="p-2 bg-accent text-bg-0 hover:bg-white transition-colors"
                >
                  <Play className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}
