"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "../AuthContext";
import SvgIcon from "@/components/ui/SvgIcon";
import Link from "next/link";

interface AdminStats {
  totalAuditions: number;
  pendingAuditions: number;
  acceptedMembers: number;
  totalEvents: number;
  totalResources: number;
  recentAuditLogs: Array<{
    id: string;
    action: string;
    created_at: string;
  }>;
}

const statCards = [
  { key: "totalAuditions", label: "Total Auditions", icon: "mic" as const, color: "text-gold", href: "/admin/auditions" },
  { key: "pendingAuditions", label: "Pending Review", icon: "hourglass" as const, color: "text-yellow-400", href: "/admin/auditions" },
  { key: "acceptedMembers", label: "Active Members", icon: "people" as const, color: "text-emerald", href: "/admin/members" },
  { key: "totalEvents", label: "Scheduled Events", icon: "calendar" as const, color: "text-blue-400", href: "/admin/events" },
  { key: "totalResources", label: "Resources Uploaded", icon: "upload" as const, color: "text-purple-400", href: "/admin/resources" },
];

const quickActions = [
  { label: "Review Auditions", href: "/admin/auditions", icon: "check_circle" as const, color: "bg-gold/10 border-gold/20 hover:border-gold/40" },
  { label: "Check-In Desk", href: "/admin/attendance", icon: "qr" as const, color: "bg-blue-500/10 border-blue-500/20 hover:border-blue-400/40" },
  { label: "Upload Resources", href: "/admin/resources", icon: "upload" as const, color: "bg-purple-500/10 border-purple-500/20 hover:border-purple-400/40" },
  { label: "View Members", href: "/admin/members", icon: "people" as const, color: "bg-emerald/10 border-emerald/20 hover:border-emerald/40" },
];

export default function AdminOverviewPage() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<AdminStats>({
    totalAuditions: 0,
    pendingAuditions: 0,
    acceptedMembers: 0,
    totalEvents: 0,
    totalResources: 0,
    recentAuditLogs: [],
  });
  const [loading, setLoading] = useState(true);

  // Chapter Stats Editor State
  const [chapters, setChapters] = useState<any[]>([]);
  const [selectedChapterId, setSelectedChapterId] = useState<string>("");
  const [formVenue, setFormVenue] = useState<string>("");
  const [formCapacity, setFormCapacity] = useState<string>("");
  const [formHighlight, setFormHighlight] = useState<string>("");
  const [formUpcoming, setFormUpcoming] = useState<string>("");
  const [formRegOpen, setFormRegOpen] = useState<boolean>(false);
  const [editorLoading, setEditorLoading] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<string>("");

  const isAdmin = profile && ["chapter_admin", "super_admin"].includes(profile.role);
  const isSuperAdmin = profile?.role === "super_admin";

  useEffect(() => {
    if (profile && isAdmin) {
      loadStats();
      loadChapters();
    }
  }, [profile]);

  // Reload form when selection changes
  useEffect(() => {
    if (selectedChapterId) {
      const selected = chapters.find(c => c.id === selectedChapterId);
      if (selected) {
        setFormVenue(selected.venue || "");
        setFormCapacity(selected.capacity || "");
        setFormHighlight(selected.highlight || "");
        setFormUpcoming(selected.upcoming_event || "");
        setFormRegOpen(!!selected.registration_open);
      }
    }
  }, [selectedChapterId, chapters]);

  const loadChapters = async () => {
    if (!profile) return;
    setEditorLoading(true);
    try {
      if (isSuperAdmin) {
        // Fetch all chapters
        const { data, error } = await (supabase
          .from("chapters") as any)
          .select("id, name, venue, capacity, highlight, upcoming_event, registration_open")
          .order("name");
        if (!error && data) {
          setChapters(data);
          if (data.length > 0) setSelectedChapterId(data[0].id);
        }
      } else if (profile.chapter_id) {
        // Fetch specific chapter admin's chapter
        const { data, error } = await (supabase
          .from("chapters") as any)
          .select("id, name, venue, capacity, highlight, upcoming_event, registration_open")
          .eq("id", profile.chapter_id)
          .single();
        if (!error && data) {
          setChapters([data]);
          setSelectedChapterId(data.id);
        }
      }
    } catch (err) {
      console.error("Error loading chapter config", err);
    } finally {
      setEditorLoading(false);
    }
  };

  const handleSaveChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChapterId) return;
    setSaveStatus("saving");
    try {
      const { error } = await supabase
        .from("chapters")
        .update({
          venue: formVenue,
          capacity: formCapacity,
          highlight: formHighlight,
          upcoming_event: formUpcoming,
          registration_open: formRegOpen
        })
        .eq("id", selectedChapterId);

      if (error) throw error;

      // Update local state
      setChapters(prev => prev.map(c => c.id === selectedChapterId ? {
        ...c,
        venue: formVenue,
        capacity: formCapacity,
        highlight: formHighlight,
        upcoming_event: formUpcoming,
        registration_open: formRegOpen
      } : c));

      setSaveStatus("success");
      setTimeout(() => setSaveStatus(""), 3000);
    } catch (err) {
      console.error("Error saving chapter stats", err);
      setSaveStatus("error");
      setTimeout(() => setSaveStatus(""), 4000);
    }
  };

  const loadStats = async () => {
    if (!profile) return;
    const chapterId = profile.chapter_id;
    const isSuperAdmin = profile.role === "super_admin";

    const auditFilter = isSuperAdmin
      ? supabase.from("system_audit_logs").select("id, action, created_at").order("created_at", { ascending: false }).limit(8)
      : supabase.from("system_audit_logs").select("id, action, created_at").order("created_at", { ascending: false }).limit(8);

    const [auditionsRes, pendingRes, membersRes, eventsRes, resourcesRes, logsRes] = await Promise.all([
      // Total auditions
      (isSuperAdmin
        ? supabase.from("auditions").select("id", { count: "exact", head: true })
        : supabase.from("auditions").select("id", { count: "exact", head: true }).eq("chapter_id", chapterId!)
      ),
      // Pending auditions
      (isSuperAdmin
        ? supabase.from("auditions").select("id", { count: "exact", head: true }).eq("status", "pending")
        : supabase.from("auditions").select("id", { count: "exact", head: true }).eq("chapter_id", chapterId!).eq("status", "pending")
      ),
      // Accepted members
      (isSuperAdmin
        ? supabase.from("profiles").select("id", { count: "exact", head: true }).in("role", ["choir_member", "band_member"])
        : supabase.from("profiles").select("id", { count: "exact", head: true }).eq("chapter_id", chapterId!).in("role", ["choir_member", "band_member"])
      ),
      // Events
      (isSuperAdmin
        ? supabase.from("chapter_events").select("id", { count: "exact", head: true }).gte("starts_at", new Date().toISOString())
        : supabase.from("chapter_events").select("id", { count: "exact", head: true }).eq("chapter_id", chapterId!).gte("starts_at", new Date().toISOString())
      ),
      // Resources
      supabase.from("resources").select("id", { count: "exact", head: true }).eq("is_active", true),
      // Audit logs
      auditFilter,
    ]);

    setStats({
      totalAuditions: auditionsRes.count || 0,
      pendingAuditions: pendingRes.count || 0,
      acceptedMembers: membersRes.count || 0,
      totalEvents: eventsRes.count || 0,
      totalResources: resourcesRes.count || 0,
      recentAuditLogs: (logsRes.data || []) as AdminStats["recentAuditLogs"],
    });
    setLoading(false);
  };

  if (!isAdmin) {
    return (
      <div className="text-center py-24 space-y-3">
        <SvgIcon name="lock" size={48} className="text-white/10 mx-auto" />
        <p className="text-white/30 font-bold">Admin access required.</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 max-w-5xl">
      {/* Header */}
      <div>
        <p className="text-[10px] text-gold uppercase tracking-widest font-black">
          {profile?.role === "super_admin" ? "Super Admin" : `Chapter Admin - ${profile?.chapter_id ? "Your Chapter" : "Unassigned"}`}
        </p>
        <h1 className="text-3xl font-black tracking-tighter mt-1">
          Admin <span className="text-gold">Overview</span>
        </h1>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map(({ key, label, icon, color, href }) => (
          <Link
            key={key}
            href={href}
            className="glass-card rounded-2xl p-5 space-y-3 hover:border-white/10 transition-all group"
          >
            <SvgIcon name={icon as any} size={20} className={`${color} group-hover:scale-110 transition-transform`} />
            <div>
              <p className={`text-2xl font-black ${color}`}>
                {loading ? "-" : stats[key as keyof Omit<AdminStats, "recentAuditLogs">]}
              </p>
              <p className="text-[10px] text-white/30 uppercase tracking-widest font-black mt-0.5">{label}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="space-y-4">
        <h2 className="text-sm font-black uppercase tracking-widest text-white/40">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {quickActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className={`flex flex-col items-center justify-center gap-3 p-5 rounded-2xl border transition-all ${action.color}`}
            >
              <SvgIcon name={action.icon} size={24} className="text-current" />
              <span className="text-xs font-black uppercase tracking-widest text-center leading-tight">{action.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Pending Alert */}
      {!loading && stats.pendingAuditions > 0 && (
        <div className="flex items-center justify-between p-5 rounded-2xl bg-yellow-400/5 border border-yellow-400/20">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-yellow-400/10 flex items-center justify-center">
              <SvgIcon name="hourglass" size={20} className="text-yellow-400" />
            </div>
            <div>
              <p className="font-black text-yellow-400">
                {stats.pendingAuditions} audition{stats.pendingAuditions > 1 ? "s" : ""} awaiting review
              </p>
              <p className="text-white/30 text-xs mt-0.5">Applicants are waiting for your decision.</p>
            </div>
          </div>
          <Link
            href="/admin/auditions"
            className="px-4 py-2 rounded-xl bg-yellow-400/10 border border-yellow-400/20 text-yellow-400 text-xs font-black uppercase tracking-widest hover:bg-yellow-400/20 transition-colors whitespace-nowrap"
          >
            Review Now →
          </Link>
        </div>
      )}

      {/* Recent Audit Log */}
      {!loading && stats.recentAuditLogs.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-black uppercase tracking-widest text-white/40">Recent System Activity</h2>
          <div className="space-y-2">
            {stats.recentAuditLogs.map((log) => (
              <div key={log.id} className="glass-card rounded-xl px-4 py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-gold/60 shrink-0" />
                  <span className="text-xs font-bold text-white/60 font-mono">
                    {log.action.replace(/_/g, " ")}
                  </span>
                </div>
                <span className="text-[10px] text-white/20 shrink-0">
                  {new Date(log.created_at).toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" })}
                  {" · "}
                  {new Date(log.created_at).toLocaleDateString("en-KE", { month: "short", day: "numeric" })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chapter Stats / Profile Editor */}
      {!editorLoading && chapters.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-white/5">
          <div className="flex items-center gap-3">
            <SvgIcon name="settings" size={18} className="text-gold" />
            <h2 className="text-sm font-black uppercase tracking-widest text-white/40">Chapter Profile & Live Stats</h2>
          </div>
          
          <form onSubmit={handleSaveChapter} className="glass-card rounded-2xl p-6 space-y-6">
            {isSuperAdmin && chapters.length > 1 && (
              <div className="space-y-2">
                <label className="text-[10px] text-white/40 uppercase tracking-widest font-black block">Select Chapter to Edit</label>
                <select
                  value={selectedChapterId}
                  onChange={(e) => setSelectedChapterId(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-gold/50"
                >
                  {chapters.map(c => (
                    <option key={c.id} value={c.id} className="bg-neutral-950 text-white">{c.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] text-white/40 uppercase tracking-widest font-black block">Venue Address</label>
                <input
                  type="text"
                  value={formVenue}
                  onChange={(e) => setFormVenue(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-gold/50"
                  placeholder="e.g. Winners' Chapel International, Likoni Road"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] text-white/40 uppercase tracking-widest font-black block">Venue Capacity</label>
                <input
                  type="text"
                  value={formCapacity}
                  onChange={(e) => setFormCapacity(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-gold/50"
                  placeholder="e.g. 15,000+"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] text-white/40 uppercase tracking-widest font-black block">Highlight Message</label>
                <input
                  type="text"
                  value={formHighlight}
                  onChange={(e) => setFormHighlight(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-gold/50"
                  placeholder="e.g. Latest: Grace for Wholeness (Oct 2025)"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] text-white/40 uppercase tracking-widest font-black block">Upcoming Event Details</label>
                <input
                  type="text"
                  value={formUpcoming}
                  onChange={(e) => setFormUpcoming(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-gold/50"
                  placeholder="e.g. April 10, 2026 - Pre-Launch Night"
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-white/2">
              <div className="space-y-0.5">
                <p className="text-xs font-black uppercase tracking-widest text-white/80">Registration Status</p>
                <p className="text-[10px] text-white/40 leading-snug">Turn on to enable live QR and signups for this chapter.</p>
              </div>
              <input
                type="checkbox"
                checked={formRegOpen}
                onChange={(e) => setFormRegOpen(e.target.checked)}
                className="w-5 h-5 accent-gold cursor-pointer"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={saveStatus === "saving"}
                className="px-6 py-3 rounded-xl bg-gold text-brown text-xs font-black uppercase tracking-widest hover:brightness-110 transition-all disabled:opacity-50"
              >
                {saveStatus === "saving" ? "Saving..." : "Save Chapter Stats"}
              </button>

              {saveStatus === "success" && (
                <span className="text-emerald text-xs font-black uppercase tracking-widest flex items-center gap-1.5 animate-fade-in">
                  <SvgIcon name="check" size={14} /> Saved Successfully
                </span>
              )}
              {saveStatus === "error" && (
                <span className="text-red-400 text-xs font-black uppercase tracking-widest flex items-center gap-1.5">
                  <SvgIcon name="close" size={14} /> Error Saving Settings
                </span>
              )}
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
