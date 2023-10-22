import React, { useEffect } from "react";
import { useRouter } from "next/router";


export default function Player() {
    const router = useRouter();
    const { id } = router.query;

    const audioRef = React.useRef<HTMLAudioElement>(null);

    const downloadAndPlayAudio = async (id: string) => {
        try {
            const backendURL = `https://ytmusic-interactions-rest-microservice.jb2k4.repl.co/download?video_id=${id}`;

            const response = await fetch(backendURL);
            const blob = await response.blob();  

            const objectURL = URL.createObjectURL(blob);

            if (audioRef.current) {
                audioRef.current.src = objectURL;  
                audioRef.current.play();         
            }
        } catch (error) {
            console.error("Error downloading and playing audio:", error);
        }
    }

    useEffect(() => {
        if (id) {
            downloadAndPlayAudio(id as string);
        }
    }, [id]); // this retults in double fetches when clientside routing, but it's fine for now

    return <>
        <audio controls ref={audioRef}></audio>
    </>
}