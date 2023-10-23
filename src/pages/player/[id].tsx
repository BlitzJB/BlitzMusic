import React, { useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { Song } from ".."; 
import { Inter } from "next/font/google";
import { set } from "zod";

const inter = Inter({
    display: "swap",
    subsets: ["latin-ext"],
})

const convertSecondsToMMSS = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds < 10 ? "0" : ""}${remainingSeconds}`;
}

export default function Player() {
    const router = useRouter();
    const { id } = router.query;

    const [playing, setPlaying] = React.useState<boolean>(false);
    const [currentSeek, setCurrentSeek] = React.useState<number>(0);
    const [loopType, setLoopType] = React.useState<"none" | "one" | "all">("none");
    const [songLoading, setSongLoading] = React.useState<boolean>(false);
    const [recommendationsLoading, setRecommendationsLoading] = React.useState<boolean>(false);
    const [currentSong, setCurrentSong] = React.useState<Song | null>(null);
    const [recommendations, setRecommendations] = React.useState<Song[] | null>([]);
    const [controlsElabled, setControlsEnabled] = React.useState<boolean>(false);

    const audioRef = React.useRef<HTMLAudioElement>(null);

    const downloadAndPlayAudio = async (id: string) => {
        try {
            setControlsEnabled(false);
            setSongLoading(true);
            const backendURL = `https://ytmusic-interactions-rest-microservice.jb2k4.repl.co/download?video_id=${id}`;

            const response = await fetch(backendURL);
            const blob = await response.blob();  

            const objectURL = URL.createObjectURL(blob);

            if (audioRef.current) {
                audioRef.current.src = objectURL;  
                audioRef.current.play();         
            }
            setSongLoading(false);
            setControlsEnabled(true);
        } catch (error) {
            console.error("Error downloading and playing audio:", error);
        }
    }

    const populateSongAndRecommendations = async (id: string) => {
        try {
            setRecommendationsLoading(true);
            const backendURL = `https://ytmusic-interactions-rest-microservice.jb2k4.repl.co/recommendations?video_id=${id}`;

            const response = await fetch(backendURL);
            const data = await response.json();
            const currentSong = data[0];

            setCurrentSong(currentSong);
            setRecommendations(data);
            setRecommendationsLoading(false);
        } catch (error) {
            console.error("Error populating song and recommendations:", error);
        }
    }

    const handleRangeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = parseFloat(e.target.value);
        setCurrentSeek(newValue);
        if (audioRef.current) {
            audioRef.current.currentTime = newValue;
        }
    };

    useEffect(() => {
        if (id) {
            downloadAndPlayAudio(id as string);
            populateSongAndRecommendations(id as string);
        }
    }, [id]); // this retults in double fetches when clientside routing, but it's fine for now

    // Update the range input when audio plays
    const handleTimeUpdate = () => {
        if (audioRef.current) {
            setCurrentSeek(audioRef.current.currentTime);
            if (audioRef.current.paused) {
                setPlaying(false);
            }
        }
    }
    
    // Set the max value of range input when audio is loaded
    const handleLoadedMetadata = () => {
        if (audioRef.current ) {
            //@ts-ignore
            document.querySelector('input[type="range"]').max = audioRef.current.duration.toString();
            setPlaying(!audioRef.current.paused);
        }
    }

    const handleEnded = () => {
        console.log("ended", loopType);
        if (audioRef.current) {
            if (loopType === "none") {
                // ... just do nothing lol
            }
            if (loopType === "one") {
                audioRef.current.currentTime = 0;
                audioRef.current.play();
            }
            if (loopType === "all") {
                const currentIndex = recommendations?.findIndex(song => song.id === currentSong?.id);
                if (currentIndex !== undefined && currentIndex !== null && currentIndex < recommendations!.length - 1) {
                    const nextSong = recommendations![currentIndex + 1];
                    if (nextSong) {
                        audioRef.current?.pause();
                        setPlaying(false);
                        setSongLoading(true);
                        downloadAndPlayAudio(nextSong.id);
                        setCurrentSong(nextSong);
                    }
                } else if (currentIndex !== undefined && currentIndex !== null && currentIndex === recommendations!.length - 1) {
                    const firstSong = recommendations![0];
                    if (firstSong) {
                        audioRef.current?.pause();
                        setPlaying(false);
                        setSongLoading(true);
                        downloadAndPlayAudio(firstSong.id);
                        setCurrentSong(firstSong);
                    }
                }
            }
        }
    }

    const handlePausePlay = () => {
        if (audioRef.current) {
            if (playing) {
                audioRef.current.pause();
            } else {
                audioRef.current.play();
            }
            setPlaying(!playing);
        }
    };

    const handleLoop = () => {
        console.log("loop", loopType);
        if (audioRef.current) {
            if (loopType === "none") {
                console.log("loop", loopType);
                setLoopType("one");
            }
            else if (loopType === "one") {
                setLoopType("all");
            }
            else if (loopType === "all") {
                setLoopType("none");
            }
        }
        console.log("loop", loopType);
    }

    const handleNext = () => {
        const currentIndex = recommendations?.findIndex(song => song.id === currentSong?.id);
        if (currentIndex !== undefined && currentIndex !== null && currentIndex < recommendations!.length - 1) {
            const nextSong = recommendations![currentIndex + 1];
            if (nextSong) {
                audioRef.current?.pause();
                setPlaying(false);
                setSongLoading(true);
                downloadAndPlayAudio(nextSong.id);
                setCurrentSong(nextSong);
            }
        }
    }

    const handlePrevious = () => {
        const currentIndex = recommendations?.findIndex(song => song.id === currentSong?.id);
        if (currentIndex !== undefined && currentIndex !== null && currentIndex > 0) {
            const previousSong = recommendations![currentIndex - 1];
            if (previousSong) {
                audioRef.current?.pause();
                setPlaying(false);
                setSongLoading(true);
                downloadAndPlayAudio(previousSong.id);
                setCurrentSong(previousSong);
            }
        }
    }

    const handleRecommendationSkip = (id: string) => {
        if (playing) {
            setPlaying(false);
            audioRef.current?.pause();
        }
        setSongLoading(true);
        downloadAndPlayAudio(id);
        setCurrentSong(recommendations?.find(song => song.id === id) || null);
    }

    const handleShare = () => {
        if (typeof window !== "undefined" && navigator.share) {
            navigator.share({
              title: `Share ${currentSong?.title} by ${currentSong?.artists.join(", ")}`,
              text: "Hey! Listen to this song on Delta Music!",
              url: window.location.href
            })
            .then(() => console.log('Successful share'))
            .catch(error => console.log('Error sharing:', error));
        }
    }


    return <div className="flex min-h-screen w-full bg-neutral-900">
        <Head>
            <title>Player | Delta Music</title>
            <link rel="icon" href="/deltamusiclogo.svg" />
        </Head>
        <div style={{ 
            backgroundImage: `linear-gradient(to right, rgba(23,23,23,1), rgba(23,23,23,1), rgba(23,23,23,.9), rgba(23,23,23,.7), rgba(23,23,23,0.4)), url("${currentSong?.thumbnail.large}")`, 
            backgroundSize: "auto 100%", 
            backgroundPosition: "right" 
        }} 
        className="bg-no-repeat bg-center bg-cover flex-grow md:px-24 px-4 pt-6 relative flex flex-col lg:max-w-[70vw]">
            <nav className="h-20 w-full relative flex items-center">
                <div>
                    <img className="h-16" src="/deltamusiclogo.svg" alt="" />
                </div>
                {
                    (songLoading || recommendationsLoading) && <div style={{ animationDuration: '400ms' }} className="animate-spin border-b border-r h-8 w-8 border-neutral-400 rounded-full ml-4"></div>
                }
                
            </nav>
            <audio className="hidden" controls ref={audioRef} onTimeUpdate={handleTimeUpdate} onLoadedMetadata={handleLoadedMetadata} onEnded={handleEnded}></audio>
            <div className="text-neutral-200 font-extrabold text-6xl mt-[18vh]">
                {currentSong?.title}
            </div>
            <div className="text-neutral-300 font-extralight text-2xl mt-2">
                {currentSong?.artists.join(", ")}
            </div>
            <div className="w-full mt-10">
                <input className="w-full z-10 styled-input opacity-40 hover:opacity-100 transition-opacity" type="range" value={currentSeek} maxLength={100} onChange={handleRangeChange} />
            </div>
            <div className="flex mt-1">
                <div className="text-neutral-200 text-medium opacity-60">
                    {convertSecondsToMMSS(currentSeek)}
                </div>
                <div className="text-neutral-200 text-medium opacity-60 ml-auto">
                    {currentSong?.length}
                </div>
            </div>
            <div className="z-10 flex items-center mt-6">
                <button onClick={handlePrevious} disabled={!controlsElabled || currentSong == recommendations![0]} className={`${currentSong == recommendations![0] ? "bg-neutral-400 opacity-10" : "bg-neutral-200 opacity-20 hover:opacity-100"} transition-opacity text-2xl text-black h-20 w-20 px-4 rounded-full py-3 mr-4 m-1 z-10 ${inter.className}`}>
                    &lt;-
                </button>
                <button disabled={!controlsElabled} onClick={handlePausePlay} className="bg-neutral-200 opacity-20 hover:opacity-100 transition-opacity text-black h-32 w-32 px-4 rounded-full py-3  m-1 z-10 flex items-center justify-center">
                    {
                        playing ? <img className="h-12 w-20" src="/pause.svg" alt="" /> : <img className="h-12 w-12" src="/play.svg" alt="" />
                    }
                </button>
                <button onClick={handleNext} disabled={!controlsElabled || currentSong == recommendations![recommendations!.length -1]} className={`${currentSong == recommendations![recommendations!.length -1] ? "bg-neutral-400 opacity-10" : "bg-neutral-200 opacity-20 hover:opacity-100"} transition-opacity text-2xl text-black h-20 w-20 px-4 rounded-full py-3 ml-4 m-1 z-10 ${inter.className}`}>
                    -&gt;
                </button>
            </div>
            <div className="z-10 flex items-center mt-auto mb-6">
                <button disabled={!controlsElabled} onClick={handleLoop} className={`${loopType === "none" ? "bg-neutral-500" : "bg-neutral-200"} text-black px-4 rounded-full py-3 h-20 w-20 m-1 z-10 flex items-center justify-center opacity-20 hover:opacity-100 transition-opacity`}>
                    {
                        loopType === "none" ? <img className="h-8" src="/loop.svg" alt="" /> : loopType === "one" ? <img className="h-8" src="/loopone.svg" alt="" /> : <img className="h-8" src="/loop.svg" alt="" />
                    }    
                </button>
                <button onClick={handleShare} disabled={!controlsElabled} className="bg-neutral-200 text-black h-20 w-20 px-4 rounded-full py-3  m-1 z-10 flex items-center justify-center opacity-20 hover:opacity-100 transition-opacity">
                    <img src="/share.svg" alt="" />
                </button>
            </div>
            {/* <img className="absolute right-0 top-0 h-screen" src={currentSong?.thumbnail.large} alt="" /> */}

        </div>
        <div className="lg:w-[30vw] px-4 cursor-pointer border-l border-neutral-600 bg-neutral-900 pt-6 overflow-y-scroll h-screen">
            <div className="flex mb-6 mt-3">
                <div className="text-neutral-500 font-bold px-2 text-xl mt-2">Up Next</div>
                <div className="ml-auto">
                    <img className="h-8 " src="/unautheduser.svg" alt="" />
                </div>
            </div>
            {
                recommendations?.map(song => <Recommendation song={song} onClick={handleRecommendationSkip} currentSong={currentSong} />)
            }
        </div>
    </div>
}

interface RecommendationProps {
    song: Song
    currentSong?: Song | null
    onClick: (id: string) => void
}

const Recommendation: React.FC<RecommendationProps> = ({ song, onClick, currentSong }) => {
    const handleClick = (id: string) => {
        if (typeof window !== "undefined") {  
            window.history.replaceState({}, "", `/player/${id}`);
        }
    }

    return <div className={`flex items-center m-2 p-2 ${currentSong!.id === song.id ? "border border-neutral-800 bg-neutral-700 bg-opacity-10" : ""}`} onClick={e => { handleClick(song.id); onClick(song.id) }}>
        <img src={song.thumbnail.large} alt="" className="h-16 w-16" />
        <div className="ml-4">
            <div className="text-neutral-300">{song.title}</div>
            <div className="text-neutral-500">{song.artists.join(", ")}</div>
        </div>
    </div>
}