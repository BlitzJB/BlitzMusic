import React, { useEffect } from "react";
import { useRouter } from "next/router";


export default function Player() {
    const router = useRouter();
    const { id } = router.query;

    const [playing, setPlaying] = React.useState<boolean>(false);
    const [currentSeek, setCurrentSeek] = React.useState<number>(0);
    const [loopType, setLoopType] = React.useState<"none" | "one" | "all">("none");
    const [loading, setLoading] = React.useState<boolean>(false);

    const audioRef = React.useRef<HTMLAudioElement>(null);

    const downloadAndPlayAudio = async (id: string) => {
        try {
            setLoading(true);
            const backendURL = `https://ytmusic-interactions-rest-microservice.jb2k4.repl.co/download?video_id=${id}`;

            const response = await fetch(backendURL);
            const blob = await response.blob();  

            const objectURL = URL.createObjectURL(blob);

            if (audioRef.current) {
                audioRef.current.src = objectURL;  
                audioRef.current.play();         
            }
            setLoading(false);
        } catch (error) {
            console.error("Error downloading and playing audio:", error);
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
                // ...
            }
            if (loopType === "one") {
                audioRef.current.currentTime = 0;
                audioRef.current.play();
            }
            if (loopType === "all") {
                // ...
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

    return <div className="min-h-screen w-full bg-neutral-900 md:px-24 px-4 pt-6">
        {
            loading ? <div className="h-48 flex items-center text-neutral-300">Loading...</div> : ""
        }
        <audio className="hidden" controls ref={audioRef} onTimeUpdate={handleTimeUpdate} onLoadedMetadata={handleLoadedMetadata} onEnded={handleEnded}></audio>
        <button onClick={handlePausePlay} className="bg-neutral-200 text-black px-4 py-3 rounded-sm m-1">
            {
                playing ? "Pause" : "Play"
            }
        </button>
        <button className="bg-neutral-200 text-black px-4 py-3 rounded-sm m-1">Next</button>
        <button className="bg-neutral-200 text-black px-4 py-3 rounded-sm m-1">Previous</button>
        <button id="loop" data-loop="none" onClick={handleLoop} className="bg-neutral-200 text-black px-4 py-3 rounded-sm m-1">Loop {loopType}</button>
        <input type="range" value={currentSeek} maxLength={100} onChange={handleRangeChange} />
    </div>
}