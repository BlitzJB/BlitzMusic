import React, { useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { Song } from ".."; 
import { Inter } from "next/font/google";

const inter = Inter({
    display: "swap",
    subsets: ["latin-ext"],
})

const convertSecondsToMMSS = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds < 10 ? "0" : ""}${remainingSeconds}`;
}

const convertMMSSToSeconds = (mmss: string) => {
    const minutes = parseInt(mmss.split(":")[0]!);
    const seconds = parseInt(mmss.split(":")[1]!);
    return (minutes * 60) + seconds;
}

export default function Player() {
    const router = useRouter();
    const { id } = router.query;

    const [playing, setPlaying] = React.useState<boolean>(false);
    const [currentSeek, setCurrentSeek] = React.useState<number>(0);
    const [loopType, setLoopType] = React.useState<"none" | "one" | "all">("all");
    const [recommendationsLoading, setRecommendationsLoading] = React.useState<boolean>(false);
    const [currentSong, setCurrentSong] = React.useState<Song | null>(null);
    const [recommendations, setRecommendations] = React.useState<Song[] | null>([]);
    const [showSidebar, setShowSidebar] = React.useState<boolean>(false);
    const [isMobileScreen, setIsMobileScreen] = React.useState<boolean>(false);
    const [audioIsBuffering, setAudioIsBuffering] = React.useState<boolean>(false);
    const audioRef = React.useRef<HTMLAudioElement>(null);

    const downloadAndPlayAudio = async (id: string) => {
        try {
            const backendURL = `https://ytmusic-interactions-rest-microservice.jb2k4.repl.co/download?video_id=${id}`;
            if (audioRef.current) {
                audioRef.current.src = backendURL;  
                audioRef.current.play();         
            }
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

    useEffect(() => {
        if (typeof window !== "undefined") {
            const mobileMediaQuery = window.matchMedia("(max-width: 768px)");
            setIsMobileScreen(mobileMediaQuery.matches);
        }
    }, []);

    useEffect(() => {
        if (currentSong && typeof window !== "undefined" && 'mediaSession' in navigator) {

            navigator.mediaSession.metadata = new MediaMetadata({
                title: currentSong.title,
                artist: currentSong.artists.join(", "),
                artwork: [
                    { src: currentSong.thumbnail.large, sizes: "512x512", type: "image/png" },
                ],
            });

            navigator.mediaSession.setActionHandler('play', () => {
                if (audioRef.current) {
                    audioRef.current.play();
                }
            });

            navigator.mediaSession.setActionHandler('pause', () => {
                if (audioRef.current) {
                    audioRef.current.pause();
                }
            });

            navigator.mediaSession.setActionHandler('previoustrack', () => {
                handlePrevious();
            });

            navigator.mediaSession.setActionHandler('nexttrack', () => {
                handleNext();
            });

            navigator.mediaSession.setActionHandler('seekto', (details) => {
                if (audioRef.current) {
                    audioRef.current.currentTime = details.seekTime ?? 0;
                }
            });

        }
    }, [currentSong]);

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            setCurrentSeek(audioRef.current.currentTime);
            if (audioRef.current.paused) {
                setPlaying(false);
            }
        }
        if (navigator.mediaSession && navigator.mediaSession.setPositionState) {
            navigator.mediaSession.setPositionState({
                duration: convertMMSSToSeconds(currentSong?.length ?? "100:00"),
                position: audioRef.current!.currentTime,
                playbackRate: 1.0
            });
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
                        downloadAndPlayAudio(nextSong.id);
                        setCurrentSong(nextSong);
                    }
                } else if (currentIndex !== undefined && currentIndex !== null && currentIndex === recommendations!.length - 1) {
                    const firstSong = recommendations![0];
                    if (firstSong) {
                        audioRef.current?.pause();
                        setPlaying(false);
                        downloadAndPlayAudio(firstSong.id);
                        setCurrentSong(firstSong);
                    }
                }
            }
        }
    }

    const onWaiting = () => {
        setAudioIsBuffering(true);
    }

    const onPlaying = () => {
        setAudioIsBuffering(false);
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
    }

    const handleNext = () => {
        const currentIndex = recommendations?.findIndex(song => song.id === currentSong?.id);
        if (currentIndex !== undefined && currentIndex !== null && currentIndex < recommendations!.length - 1) {
            const nextSong = recommendations![currentIndex + 1];
            if (nextSong) {
                audioRef.current?.pause();
                setPlaying(false);
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
        downloadAndPlayAudio(id);
        setCurrentSong(recommendations?.find(song => song.id === id) || null);
    }

    const handleShare = () => {
        if (typeof window !== "undefined" && navigator.share) {
            navigator.share({
              title: `Share ${currentSong?.title} by ${currentSong?.artists.join(", ")}`,
              text: `Hey! Listen to ${currentSong?.title} on Delta Music!`,
              url: window.location.href
            })
            .then(() => console.log('Successful share'))
            .catch(error => console.log('Error sharing:', error));
        }
    }

    const handleQueueSideBarCollapse = () => {
        setShowSidebar(!showSidebar);
    }

    return <div className="flex min-h-screen w-full bg-neutral-900">
        <Head>
            <title>{currentSong ? `Playing ${currentSong.title}` : "Player | Delta Music"}</title>
            <link rel="icon" href="/brand/deltamusiclogo.svg" />
        </Head>
        <div style={{ 
            backgroundImage: isMobileScreen ? `linear-gradient(to top, rgba(23,23,23,1), rgba(23,23,23,1), rgba(23,23,23,1), rgba(23,23,23,1), rgba(23,23,23,1), rgba(23,23,23,.9), rgba(23,23,23,.7), rgba(23,23,23,0.4)), url("${currentSong?.thumbnail.large}")` : `linear-gradient(to right, rgba(23,23,23,1), rgba(23,23,23,1), rgba(23,23,23,.9), rgba(23,23,23,.7), rgba(23,23,23,0.4)), url("${currentSong?.thumbnail.large}")`, 
            backgroundSize: isMobileScreen ? "100% auto" : "auto 100%", 
            backgroundPosition: isMobileScreen ? "top left" : "right",
            width: isMobileScreen ? "100vw" : "70vw",
            maxWidth: isMobileScreen ? "100vw" : "70vw",
        }} 
        className={`bg-no-repeat overflow-hidden bg-center bg-cover flex-grow md:px-20 px-4 pt-6 relative flex flex-col  transition-all`}>
            <nav className="h-20 w-full relative flex items-center">
                <div onClick={e => router.push('/')} className="cursor-pointer">
                    <img className="h-16" src="/brand/deltamusiclogo.svg" alt="" />
                </div>
                {
                    (audioIsBuffering || recommendationsLoading) && <div style={{ animationDuration: '400ms' }} className="animate-spin border-b border-r h-8 w-8 border-neutral-400 rounded-full ml-4"></div>
                }
                <button onClick={handleQueueSideBarCollapse} className={`${isMobileScreen ? "" : "translate-x-[4.5rem] hidden "} ${isMobileScreen && showSidebar ? "hidden" : ""} ml-auto bg-neutral-200 text-black h-16 w-16 px-4 rounded-full py-3  m-1 z-10 flex items-center justify-center opacity-20 hover:opacity-100 transition-opacity`}>
                    <img className="h-6" src="/icons/queue.svg" alt="" />
                </button>
            </nav>
            <audio className="hidden" controls ref={audioRef} onTimeUpdate={handleTimeUpdate} onLoadedMetadata={handleLoadedMetadata} onEnded={handleEnded} onWaiting={onWaiting} onPlaying={onPlaying}></audio>
            <div className="text-neutral-200 font-extrabold md:text-5xl text-4xl md:mt-[15vh] mt-[18vh]">
                {currentSong?.title}
            </div>
            <div className="text-neutral-300 font-extralight text-xl mt-3">
                {currentSong?.artists.join(", ")}
            </div>
            <div className="w-full mt-10">
                <input className="w-full z-10 styled-input opacity-40 hover:opacity-100 transition-opacity" type="range" value={currentSeek} maxLength={100} onChange={handleRangeChange} />
            </div>
            <div className="flex mt-1">
                <div className="text-neutral-200 text-sm opacity-60">
                    {convertSecondsToMMSS(currentSeek)}
                </div>
                <div className="text-neutral-200 text-sm opacity-60 ml-auto">
                    {currentSong?.length}
                </div>
            </div>
            <div className=" flex items-center md:mx-0 mx-auto md:mt-4 mt-auto">
                <button onClick={handlePrevious} disabled={currentSong == recommendations![0]} className={`${currentSong == recommendations![0] ? "bg-neutral-400 opacity-10" : "bg-neutral-200 opacity-20 hover:opacity-100"} transition-opacity md:text-2xl text-xl text-black md:h-16 md:w-16 h-14 w-14 px-4 rounded-full py-3 mr-4 m-1  ${inter.className}`}>
                    &lt;-
                </button>
                <button onClick={handlePausePlay} className="bg-neutral-200 opacity-20 hover:opacity-100 transition-opacity text-black md:h-28 h-20 md:w-28 w-20 px-4 rounded-full py-3  m-1  flex items-center justify-center">
                    {
                        playing ? <img className="md:h-12 h-8 md:w-12 w-8" src="/icons/pause.svg" alt="" /> : <img className="md:h-12 h-8 md:w-12 w-8" src="/icons/play.svg" alt="" />
                    }
                </button>
                <button onClick={handleNext} disabled={currentSong == recommendations![recommendations!.length -1]} className={`${currentSong == recommendations![recommendations!.length -1] ? "bg-neutral-400 opacity-10" : "bg-neutral-200 opacity-20 hover:opacity-100"} transition-opacity md:text-2xl text-xl text-black md:h-16 md:w-16 h-14 w-14 px-4 rounded-full py-3 ml-4 m-1  ${inter.className}`}>
                    -&gt;
                </button>
            </div>
            <div className=" flex items-center md:mt-auto md:mx-0 mx-auto md:mb-6 mb-8">
                <button onClick={handleLoop} className={`${loopType === "none" ? "bg-neutral-200" : "bg-neutral-200"} text-black px-4 rounded-full py-3 md:h-16 md:w-16 h-12 w-12 m-1  flex items-center justify-center opacity-20 hover:opacity-100 transition-opacity md:mr-0 mr-6`}>
                    {
                        loopType === "none" ? <img className="h-6" src="/icons/noloop.svg" alt="" /> : loopType === "one" ? <img className="h-6" src="/icons/loopone.svg" alt="" /> : <img className="h-6" src="/icons/loop.svg" alt="" />
                    }    
                </button>
                <button onClick={handleShare} className="bg-neutral-200 text-black md:h-16 md:w-16 h-12 w-12 px-4 rounded-full py-3  m-1  flex items-center justify-center opacity-20 hover:opacity-100 transition-opacity">
                    <img className="h-5" src="/icons/share.svg" alt="" />
                </button>
            </div>
            {/* <img className="absolute right-0 top-0 h-screen" src={currentSong?.thumbnail.large} alt="" /> */}

        </div>
        <div className={`lg:w-[30vw] px-2 cursor-pointer border-l border-neutral-600 bg-neutral-900 pt-6 overflow-y-scroll h-screen transition-all ${isMobileScreen ? "absolute scrollbar-hidden top-0 " : ""}`} style={{
            width: !isMobileScreen ? "30vw" : !showSidebar ? "0vw" : isMobileScreen ? "100vw" : "30vw",
            maxWidth: !isMobileScreen ? "30vw" : !showSidebar ? "0vw" : isMobileScreen ? "100vw" : "30vw",
            display: !isMobileScreen ? "block" : !showSidebar ? "none" : "block",
        }}>
            <div className="flex mb-6 mt-3">
                <div className="text-neutral-500 font-bold px-2 text-lg mt-2 flex flex-col">
                    <button className={inter.className + " mr-2 w-fit font-bold text-sm py-3 md:hidden"} onClick={e => setShowSidebar(!showSidebar)}>&lt;- Back</button>
                    Up Next
                </div>
                <div className="ml-auto">
                    <img className="h-8 " src="/icons/unautheduser.svg" alt="" />
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
        <img src={song.thumbnail.large} alt="" className="h-14 w-14" />
        <div className="ml-4">
            <div className="text-neutral-300 text-sm">{song.title}</div>
            <div className="text-neutral-500 text-sm">{song.artists.join(", ")}</div>
        </div>
    </div>
}