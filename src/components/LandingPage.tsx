import { motion } from "motion/react";
import { Shield, Zap, Search, Code, ArrowRight } from "lucide-react";

export default function LandingPage({ onStart }: { onStart: () => void }) {
  return (
    <div className="min-h-screen bg-bg-0 selection:bg-accent selection:text-bg-0">
      {/* Navigation */}
      <nav className="flex items-center justify-between p-4 md:p-8 border-b border-border">
        <div className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-accent" />
          <span className="font-display font-bold text-lg md:text-xl tracking-tighter">GAMEGUARD</span>
        </div>
        <div className="flex items-center gap-4 md:gap-8">
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="meta-label hover:text-accent transition-colors">Features</a>
            <a href="#pricing" className="meta-label hover:text-accent transition-colors">Pricing</a>
          </div>
          <button 
            onClick={onStart}
            className="px-4 md:px-6 py-2 bg-accent text-bg-0 font-bold text-[10px] md:text-xs uppercase tracking-widest hover:bg-white transition-colors"
          >
            Get Started
          </button>
        </div>
      </nav>

      {/* Hero Section - Recipe 2 */}
      <main className="px-4 md:px-8 py-16 md:py-24">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="flex flex-col gap-4"
          >
            <span className="meta-label text-accent">Phase 1: Foundation</span>
            <h1 className="display-text">
              AI-Powered<br className="hidden md:block" />
              Security for<br className="hidden md:block" />
              Game Devs
            </h1>
            <p className="max-w-2xl text-lg md:text-xl text-txt-muted mt-4 md:mt-8 leading-relaxed">
              Detect vulnerabilities, logic flaws, and security issues across your codebase 
              with our state-of-the-art AI-powered scan engine.
            </p>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mt-8 md:mt-12">
              <button 
                onClick={onStart}
                className="group flex items-center justify-center gap-4 px-8 py-4 bg-accent text-bg-0 font-bold text-sm uppercase tracking-widest hover:bg-white transition-all"
              >
                Start Free Trial
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <button className="px-8 py-4 border border-border text-txt font-bold text-sm uppercase tracking-widest hover:bg-bg-1 transition-colors">
                View Demo
              </button>
            </div>
          </motion.div>
        </div>
      </main>

      {/* Features Grid */}
      <section id="features" className="px-4 md:px-8 py-16 md:py-24 border-t border-border bg-bg-1">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
            {[
              { icon: Zap, title: "Real-time Scans", desc: "Instant feedback as you write code, integrated with your CI/CD pipeline." },
              { icon: Search, title: "Deep Analysis", desc: "Our engine goes beyond regex to understand code flow and logic." },
              { icon: Code, title: "Multi-Language", desc: "Support for JS, TS, Python, Go, and Rust out of the box." },
              { icon: Shield, title: "Security First", desc: "Focused on OWASP Top 10 and enterprise-grade security standards." }
            ].map((feature, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className="p-8 border border-border bg-bg-0 hover:border-accent transition-colors"
              >
                <feature.icon className="w-8 h-8 text-accent mb-6" />
                <h3 className="font-display font-bold text-lg mb-4 uppercase tracking-tight">{feature.title}</h3>
                <p className="text-txt-muted text-sm leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-8 py-12 border-t border-border flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="flex items-center gap-2 opacity-50">
          <Shield className="w-4 h-4" />
          <span className="font-display font-bold text-sm tracking-tighter">GAMEGUARD © 2026</span>
        </div>
        <div className="flex gap-8">
          <a href="#" className="meta-label hover:text-accent transition-colors">Twitter</a>
          <a href="#" className="meta-label hover:text-accent transition-colors">GitHub</a>
          <a href="#" className="meta-label hover:text-accent transition-colors">Docs</a>
        </div>
      </footer>
    </div>
  );
}
