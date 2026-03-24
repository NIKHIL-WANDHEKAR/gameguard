import { useState, useEffect } from "react";
import LandingPage from "./components/LandingPage";
import Dashboard from "./components/Dashboard";
import { Shield, ArrowRight, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { auth, db } from "./firebase";
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged,
  User as FirebaseUser,
  signOut
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp, getDocFromServer } from "firebase/firestore";

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Ensure user document exists
        const userRef = doc(db, "users", firebaseUser.uid);
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists()) {
          const defaultSpaceId = `space-${Math.floor(Math.random() * 1000000)}`;
          const spaceRef = doc(db, "spaces", defaultSpaceId);
          
          await setDoc(spaceRef, {
            id: defaultSpaceId,
            name: "Default Space",
            description: "Your primary workspace",
            ownerId: firebaseUser.uid,
            members: {
              [firebaseUser.uid]: 'owner'
            },
            createdAt: serverTimestamp()
          });

          await setDoc(userRef, {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            role: "user",
            currentSpaceId: defaultSpaceId,
            spaceIds: [defaultSpaceId],
            createdAt: serverTimestamp()
          });
        }
        setUser(firebaseUser);
      } else {
        setUser(null);
      }
      setIsAuthReady(true);
    });

    // Test connection
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    };
    testConnection();

    return () => unsubscribe();
  }, []);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      setShowLogin(false);
    } catch (error) {
      console.error("Login failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  if (!isAuthReady) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-0">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user) {
    return <Dashboard onLogout={handleLogout} />;
  }

  return (
    <div className="relative">
      <LandingPage onStart={() => setShowLogin(true)} />

      <AnimatePresence>
        {showLogin && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLogin(false)}
              className="absolute inset-0 bg-bg-0/90 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-bg-1 border border-border p-8 shadow-2xl"
            >
              <button 
                onClick={() => setShowLogin(false)}
                className="absolute top-4 right-4 p-2 hover:bg-bg-2 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 mb-8">
                <Shield className="w-6 h-6 text-accent" />
                <span className="font-display font-bold text-xl tracking-tighter uppercase">GameGuard</span>
              </div>

              <h2 className="font-display font-bold text-2xl mb-2 uppercase tracking-tight">Welcome Back</h2>
              <p className="text-txt-muted text-sm mb-8">Secure your codebase with GameGuard AI.</p>

              <div className="flex flex-col gap-6">
                <button 
                  onClick={handleGoogleLogin}
                  disabled={isLoading}
                  className="flex items-center justify-center gap-3 px-8 py-4 bg-accent text-bg-0 font-bold text-sm uppercase tracking-widest hover:bg-white transition-all disabled:opacity-50"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-bg-0 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      Continue with Google
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>


              <div className="mt-8 pt-8 border-t border-border flex flex-col gap-4">
                <button className="w-full py-3 border border-border text-xs font-bold uppercase tracking-widest hover:bg-bg-2 transition-colors">
                  Continue with SSO
                </button>
                <p className="text-center text-[10px] text-txt-muted uppercase tracking-widest">
                  Secure Enterprise Authentication
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

