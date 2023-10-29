import { useState } from "react"
import { Inter } from "next/font/google"

const inter = Inter({
    display: "swap",
    subsets: ["latin-ext"],
})


export default function Home() {

    const [isSearching, setIsSearching] = useState(false)

    return <>
        <main className="min-h-screen w-full bg-slate-100">
            <div className="absolute top-0 left-0 w-full h-screen bg-slate-400">
                <div className="w-full h-1/2 bg-slate-600 relative flex">
                    <img className="h-14 w-14" src="/brand/deltamusiclogo.svg" alt="" />
                    <div className={`absolute left-1/2 top-0 -translate-x-1/2 bg-neutral-900 transition-all ${isSearching ? "w-full h-screen" : "w-1/2 h-12 rounded-full"}`}>
                        <div onClick={e => setIsSearching(false)} className="font-bold text-neutral-300 p-4">
                            <span className={inter.className}>&lt;- Back</span>
                        </div>
                    </div>
                    <div onClick={e => setIsSearching(true)} className="absolute flex items-center left-1/2 top-0 -translate-x-1/2 w-1/2 h-12 bg-neutral-800 rounded-full cursor-pointer">
                        <input placeholder="Find your kind of music" className="flex-grow ml-6 h-full bg-transparent outline-none placeholder:text-neutral-300 text-neutral-300 font-semibold placeholder:font-semibold" type="text" />
                        <div className="h-10 w-10 bg-neutral-200 rounded-full mr-1 flex items-center justify-center font-bold -rotate-45">
                            <span className={inter.className}>-&gt;</span>
                        </div>
                    </div>
                    <img className="h-12 w-12 ml-auto" src="/icons/unautheduser.svg" alt="" />

                </div>
            </div>

        </main>
    
    </>
}