import { signIn, signOut, useSession } from "next-auth/react";
import Head from "next/head";
import Link from "next/link";
import { Inter } from "next/font/google"
import { api } from "~/utils/api";
import { ChangeEvent, FC, useEffect, useState } from "react";
import { useRouter } from "next/router";
import { time } from "console";

const inter = Inter({
    display: "swap",
    subsets: ["latin-ext"],
})

export default function Home() {
    return (
        <>
            <Head>
                <title>Delta Music</title>
                <link rel="icon" href="/brand/deltamusiclogo.svg" />
                <link rel="manifest" href="/pwa/manifest.json" />
            </Head>
            <div className="h-screen scrollbar-hidden w-full bg-neutral-900 md:px-20 px-4 pt-6">
                <nav className="h-20 w-full relative flex items-center">
                    <div>
                        <img className="h-16" src="/brand/deltamusiclogo.svg" alt="" />
                    </div>
                    <div className="ml-auto">
                        <img className="h-8 " src="/icons/unautheduser.svg" alt="" />
                    </div>
                </nav>
                <main className="flex-grow">
                    <Search />
                    <SongCartExplorer label="Recents" authed={false} />
                    <SongCartExplorer label="Playlists" authed={false} />
                    <SongCartExplorer label="Favourites" authed={false} />
                    <SongCartExplorer label="Blends" authed={false} />
                    <div className="mt-8 w-full text-center pb-4 text-neutral-300">
                        Made with ❤️ by <a className="text-rose-500" href="https://snucdelta.tech">Delta</a>
                    </div>
                </main>
            </div>
        </>
    );
}

interface SongCardExplorerProps {
    label: string;
    songs?: any[];
    authed: boolean;
}

const SongCartExplorer: FC<SongCardExplorerProps> = ({ label, songs, authed }) => {
    return (
        <>
            <div className="mb-12">
                <div className="text-xl text-neutral-300 font-semibold">
                    {label}
                </div>
                <div className={`${authed ? "h-48" : "h-20"} flex items-center text-neutral-500`}>
                    {authed ? "" : `Log in to see your ${label.toLowerCase()}`}
                </div>
            </div>
        </>
    );
}

export interface Song {
    id: string
    title: string
    artists: string[]
    thumbnail: {
        large: string
        mini: string
    }
    length: string;
}

const Search = () => {
    const [searchIsFocused, setSearchIsFocused] = useState(false);
    const [results, setResults] = useState<Song[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [query, setQuery] = useState("");
    const router = useRouter();

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (query) {
                setLoading(true);
                fetch(`https://ytmusic-interactions-rest-microservice.jb2k4.repl.co/search?query=${query}&lim=15`)
                    .then((response) => response.json())
                    .then((data) => {
                        setResults(data);
                        setLoading(false);
                    })
                    .catch((error) => {
                        setError(error);
                        setLoading(false);
                        console.error(error);
                    });
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [query]);

    const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
        setQuery(e.target.value);
    };

    return (
        <>
            <div className="flex mt-6 mb-8 relative">
                <input
                    onFocus={() => setSearchIsFocused(true)}
                    onBlur={() => {setTimeout(() => setSearchIsFocused(false), 300)}}
                    onChange={handleInputChange}
                    className="w-full h-12 px-4 rounded-sm bg-transparent border-neutral-600 border placeholder:text-neutral-500 hover:border-rose-500 focus:border-rose-500 transition-colors hover:placeholder:text-rose-100 focus:placeholder:text-rose-100 focus:text-rose-100 text-neutral-200 outline-none"
                    type="text"
                    placeholder="Name the song or that one lyric thats stuck in your head. Just search!"
                />
                <button className=" flex ml-2 items-center justify-center w-16 py-0 text-neutral-200    hover:bg-rose-700 hover:border-rose-500 border-neutral-600 border font-medium rounded-sm transition-colors">
                    {
                        loading ? (<div style={{ animationDuration: '450ms' }} className="h-6 w-6 rounded-full animate-spin border-t-2 border-red-500"></div>) : (<div className={inter.className}>-&gt;</div>)
                    }
                </button>
                <div
                    className={`bg-neutral-800 absolute top-0 mt-14 w-full max-h-[calc(100vh-12rem)] overflow-y-scroll ${(searchIsFocused && query && !loading) ? "block" : "hidden"}`}
                >   
                    <ul>
                        {loading && <div>Loading...</div>}
                        {error && <div>Error</div>}
                        {
                            !loading && !error && (
                                results.map((result) => <Song song={result} onClick={e => {router.push(`/player/${result.id}`).then(done => done && setSearchIsFocused(false))}} />)
                            ) 
                        }
                    </ul>
                </div>
            </div>
        </>
    );
};


interface SongProps {
    song: Song
    onClick: (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
}

const Song: FC<SongProps> = ({ song }) => {
    const [visible, setVisible] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const timer = setTimeout(() => {
            setVisible(true);
        }, 100 * Math.random());
        return () => {
            clearTimeout(timer);
        }
    }, [visible])

    return <div onClick={e => router.push(`/player/${song.id}`)} className={`mb-1 ${visible ? "opacity-1" : "opacity-0"} transition-all cursor-pointer border-t border-b hover:border-opacity-40 border-transparent hover:border-rose-900 flex items-center`} key={song.id}>
        <img
            className="h-16 w-16 rounded-sm"
            src={song.thumbnail.mini}
            alt=""
        />
        <div className="ml-4">
            <div className="text-neutral-300 font-semibold">
                {song.title}
            </div>
            <div className="text-neutral-500">
                {song.artists.join(", ")}
            </div>
        </div>
    </div>
}