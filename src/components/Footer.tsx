"use client";

import Link from "next/link";
import Image from "next/image";
import SvgIcon from "@/components/ui/SvgIcon";
import AflewoHorizon from "@/components/AflewoHorizon";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Footer() {
    const currentYear = new Date().getFullYear();
    const [email, setEmail] = useState("");
    const [subState, setSubState] = useState<"idle" | "sending" | "done">("idle");
    const [copiedText, setCopiedText] = useState<string | null>(null);
    const router = useRouter();

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedText(text);
        setTimeout(() => setCopiedText(null), 2000);
    };

    const handleSubscribe = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;
        setSubState("sending");
        await new Promise((r) => setTimeout(r, 1000));
        router.push(`/join?email=${encodeURIComponent(email)}`);
        setSubState("done");
    };

    return (
        <footer className="relative pt-24 pb-12 px-6 overflow-hidden z-10 bg-[#0d0908]">
            {/* ─── Layered Horizon Illustration Background ─── */}
            <div className="absolute inset-0 pointer-events-none select-none overflow-hidden z-0">
                <AflewoHorizon className="absolute bottom-0 w-full h-full" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-black/30 via-transparent to-transparent"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-[#0d0908] via-transparent to-[#0d0908]/60"></div>
            </div>

            <div className="max-w-6xl mx-auto relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-16 mb-24">
                    {/* Logo & Vision */}
                    <div className="md:col-span-12 lg:col-span-5 space-y-8">
                        <Link href="/" className="flex items-center gap-4 group">
                            <div className="relative w-16 h-16 group-hover:rotate-6 transition-transform duration-500">
                                <Image
                                    src="/brand/AFLEWO LOGO 1-Photoroom.png"
                                    alt="AFLEWO"
                                    fill
                                    className="object-contain"
                                />
                            </div>
                            <span className="font-display font-black text-3xl tracking-tighter text-white/95 [text-shadow:_0_2px_8px_rgb(0_0_0_/_80%)]">AFRICA LET&apos;S WORSHIP</span>
                        </Link>
                        <p className="text-white/95 [text-shadow:_0_1px_4px_rgb(0_0_0_/_80%)] text-lg font-medium leading-relaxed italic max-w-md">
                            Igniting and uniting Africa through worship. One God, one people, one Africa.
                            The sound of heaven echoing from the heart of the continent since 2004.
                        </p>
                        <div className="flex gap-4">
                            <a href="https://aflewo.org" target="_blank" rel="noopener noreferrer" aria-label="AFLEWO Website"
                                className="p-3 bg-black/40 rounded-lg backdrop-blur-md border border-white/10 rounded-ios text-gold hover:bg-gold hover:text-brown transition-all z-10">
                                <SvgIcon name="globe" size={20} className="text-gold" />
                            </a>
                            <a href="https://chat.whatsapp.com/AflewoNairobi" target="_blank" rel="noopener noreferrer" aria-label="AFLEWO WhatsApp"
                                className="p-3 bg-black/40 rounded-lg backdrop-blur-md border border-white/10 rounded-ios text-gold hover:bg-gold hover:text-brown transition-all z-10">
                                <SvgIcon name="whatsapp" size={20} className="text-gold" />
                            </a>
                            <a href="https://youtube.com/@aflewoke" target="_blank" rel="noopener noreferrer" aria-label="AFLEWO YouTube"
                                className="p-3 bg-black/40 rounded-lg backdrop-blur-md border border-white/10 rounded-ios text-gold hover:bg-gold hover:text-brown transition-all z-10">
                                <SvgIcon name="youtube" size={20} className="text-gold" />
                            </a>
                            <a href="mailto:nairobi@aflewo.org" aria-label="Email AFLEWO"
                                className="p-3 bg-black/40 rounded-lg backdrop-blur-md border border-white/10 rounded-ios text-gold hover:bg-gold hover:text-brown transition-all z-10">
                                <SvgIcon name="mail" size={20} className="text-gold" />
                            </a>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-12 md:col-span-12 lg:col-span-7">
                        {/* Quick Links */}
                        <div className="space-y-6">
                            <h4 className="font-display font-black text-gold uppercase tracking-widest text-xs [text-shadow:_0_1px_4px_rgb(0_0_0_/_90%)]">Explore</h4>
                            <ul className="space-y-4 text-white/95 font-black text-[10px] uppercase tracking-widest [text-shadow:_0_1px_4px_rgb(0_0_0_/_90%)]">
                                <li><Link href="/about" className="hover:opacity-75 transition-all">Our Story</Link></li>
                                <li><Link href="/about#timeline" className="hover:opacity-75 transition-all">Timeline</Link></li>
                                <li><Link href="/media" className="hover:opacity-75 transition-all">Media</Link></li>
                                <li><Link href="/testify" className="hover:opacity-75 transition-all">Testify</Link></li>
                                <li><Link href="/join" className="hover:opacity-75 transition-all">Join Us</Link></li>
                                <li><Link href="/alumni" className="hover:opacity-75 transition-all">Alumni</Link></li>
                            </ul>
                        </div>

                        {/* Chapters */}
                        <div className="space-y-6">
                            <h4 className="font-display font-black text-gold uppercase tracking-widest text-xs [text-shadow:_0_1px_4px_rgb(0_0_0_/_90%)]">Chapters</h4>
                            <ul className="space-y-4 text-white/95 font-black text-[10px] uppercase tracking-widest [text-shadow:_0_1px_4px_rgb(0_0_0_/_90%)]">
                                <li><Link href="/chapters/nairobi" className="hover:opacity-75 transition-all">Nairobi</Link></li>
                                <li><Link href="/chapters/mombasa" className="hover:opacity-75 transition-all">Mombasa</Link></li>
                                <li><Link href="/chapters/kampala" className="hover:opacity-75 transition-all">Kampala</Link></li>
                                <li><Link href="/chapters/rwanda" className="hover:opacity-75 transition-all">Kigali</Link></li>
                                <li><Link href="/chapters/tanzania" className="hover:opacity-75 transition-all">Tanzania</Link></li>
                                <li><Link href="/chapters/nakuru" className="hover:opacity-75 transition-all">Nakuru</Link></li>
                            </ul>
                        </div>

                        {/* Newsletter */}
                        <div className="space-y-6 md:col-span-1 min-w-[200px]">
                            <h4 className="font-display font-black text-gold uppercase tracking-widest text-xs [text-shadow:_0_1px_4px_rgb(0_0_0_/_90%)]">Stay Connected</h4>
                            <div className="space-y-4">
                                <p className="text-[10px] text-white/95 font-black uppercase tracking-widest leading-relaxed [text-shadow:_0_1px_4px_rgb(0_0_0_/_90%)]">
                                    Join our community & stay updated.
                                </p>
                                {subState === "done" ? (
                                    <div className="flex items-center gap-2 text-gold text-[10px] font-black uppercase tracking-widest [text-shadow:_0_1px_4px_rgb(0_0_0_/_90%)]">
                                        <SvgIcon name="check" size={16} className="text-gold" /> Subscribed!
                                    </div>
                                ) : (
                                    <form onSubmit={handleSubscribe} className="relative">
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="email@africa.com"
                                            className="w-full bg-black/30 backdrop-blur-md border border-white/20 rounded-full py-3 pl-6 pr-12 text-xs font-medium text-white appearance-none outline-none focus:ring-1 focus:ring-gold"
                                        />
                                        <button
                                            type="submit"
                                            disabled={subState === "sending"}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-gold text-brown rounded-full hover:scale-110 transition-transform flex items-center justify-center disabled:opacity-50 shadow-md"
                                        >
                                            {subState === "sending"
                                                ? <SvgIcon name="spin" size={16} className="animate-spin" />
                                                : <SvgIcon name="arrow_forward" size={16} />
                                            }
                                        </button>
                                    </form>
                                )}
                                <div className="space-y-2 pt-2 text-white/95 [text-shadow:_0_1px_4px_rgb(0_0_0_/_90%)]">
                                    <p className="text-[9px] opacity-40 font-black uppercase tracking-widest text-white">M-Pesa Support</p>
                                    <p className="text-[10px] font-black cursor-pointer hover:opacity-80 transition-colors" onClick={() => handleCopy('891300')}>
                                        Paybill: <span className="opacity-80 font-bold">891300</span>
                                        <span className="text-[8px] opacity-50 ml-2 font-normal">
                                            {copiedText === '891300' ? '(Copied!)' : '(tap to copy)'}
                                        </span>
                                    </p>
                                    <p className="text-[9px] font-black cursor-pointer hover:opacity-80 transition-colors" onClick={() => handleCopy('AFLEWONBI')}>
                                        Account: <span className="opacity-80 font-bold">AFLEWONBI</span>
                                        <span className="text-[8px] opacity-50 ml-2 font-normal">
                                            {copiedText === 'AFLEWONBI' ? '(Copied!)' : '(tap to copy)'}
                                        </span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 text-[10px] font-black uppercase tracking-[0.2em] text-white/60 [text-shadow:_0_1px_2px_rgb(0_0_0_/_90%)]">
                    <div>© {currentYear} Africa Let's Worship</div>
                    <div className="flex gap-8">
                        <Link href="/privacy" className="hover:text-gold transition-colors">Privacy Policy</Link>
                        <a href="tel:*456*891300#" className="hover:text-gold transition-colors">M-Pesa: *456*891300#</a>
                        <Link href="/join" className="hover:text-gold transition-colors">Partner With Us</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}