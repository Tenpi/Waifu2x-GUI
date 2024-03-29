import {ipcRenderer} from "electron"
import {shell} from "@electron/remote"
import path from "path"
import React, {useContext, useEffect, useRef, useState, useReducer} from "react"
import {ProgressBar} from "react-bootstrap"
import pSBC from "shade-blend-color"
import fs from "fs"
import arrow from "../assets/arrow.png"
import closeContainerHover from "../assets/closeContainer-hover.png"
import closeContainer from "../assets/closeContainer.png"
import contract from "../assets/contract.png"
import expand from "../assets/expand.png"
import locationButtonHover from "../assets/locationButton-hover.png"
import locationButton from "../assets/locationButton.png"
import startButtonHover from "../assets/startButton-hover.png"
import startButton from "../assets/startButton.png"
import stopButtonHover from "../assets/stopButton-hover.png"
import stopButton from "../assets/stopButton.png"
import trashButtonHover from "../assets/trashButton-hover.png"
import trashButton from "../assets/trashButton.png"
import {DirectoryContext, FramerateContext, SDColorSpaceContext, UpscalerContext, CompressContext, FPSMultiplierContext, PNGFramesContext,
GIFQualityContext, GIFTransparencyContext, JPGQualityContext, ModeContext, NoiseContext, OriginalFramerateContext, ParallelFramesContext, PDFDownscaleContext,
PitchContext, PNGCompressionContext, PreviewContext, RenameContext, ReverseContext, ScaleContext, SpeedContext, ThreadsContext, VideoQualityContext,
PythonDownscaleContext} from "../renderer"
import functions from "../structures/functions"
import "../styles/filecontainer.less"

interface FileContainerProps {
    id: number
    remove: (id: number) => void
    setStart: (id: number) => void
    type: "image" | "gif" | "animated webp" | "video" | "pdf"
    source: string
    height: number
    width: number
    framerate?: number
    image?: string
}

let realEvent = true
let mouseStopped = false
let timer = null as any

const FileContainer: React.FunctionComponent<FileContainerProps> = (props: FileContainerProps) => {
    const {directory} = useContext(DirectoryContext)
    const {scale} = useContext(ScaleContext)
    const {noise} = useContext(NoiseContext)
    const {mode} = useContext(ModeContext)
    const {fpsMultiplier, setFPSMultiplier} = useContext(FPSMultiplierContext)
    const {speed} = useContext(SpeedContext)
    const {reverse} = useContext(ReverseContext)
    const {originalFramerate} = useContext(OriginalFramerateContext)
    const {framerate} = useContext(FramerateContext)
    const {videoQuality} = useContext(VideoQualityContext)
    const {gifQuality} = useContext(GIFQualityContext)
    const {pngCompression} = useContext(PNGCompressionContext)
    const {jpgQuality} = useContext(JPGQualityContext)
    const {parallelFrames} = useContext(ParallelFramesContext)
    const {pythonDownscale} = useContext(PythonDownscaleContext)
    const {threads} = useContext(ThreadsContext)
    const {upscaler} = useContext(UpscalerContext)
    const {compress} = useContext(CompressContext)
    const {rename} = useContext(RenameContext)
    const {pitch} = useContext(PitchContext)
    const {sdColorSpace} = useContext(SDColorSpaceContext)
    const {gifTransparency} = useContext(GIFTransparencyContext)
    const {previewVisible} = useContext(PreviewContext)
    const {pngFrames, setPNGFrames} = useContext(PNGFramesContext)
    const {pdfDownscale, setPDFDownscale} = useContext(PDFDownscaleContext)
    const [hover, setHover] = useState(false)
    const [hoverClose, setHoverClose] = useState(false)
    const [hoverLocation, setHoverLocation] = useState(false)
    const [hoverTrash, setHoverTrash] = useState(false)
    const [hoverStart, setHoverStart] = useState(false)
    const [hoverStop, setHoverStop] = useState(false)
    const [output, setOutput] = useState("")
    const [outputImage, setOutputImage] = useState("")
    const [started, setStarted] = useState(false)
    const [stopped, setStopped] = useState(false)
    const [deleted, setDeleted] = useState(false)
    const [progress, setProgress] = useState(null) as any
    const [interlopProgress, setInterlopProgress] = useState(null) as any
    const [frame, setFrame] = useState("")
    const [frames, setFrames] = useState("")
    const [progressColor, setProgressColor] = useState("")
    const [backgroundColor, setBackgroundColor] = useState("")
    const [lockedStats, setLockedStats] = useState({}) as any
    const [progressLock, setProgressLock] = useState(false)
    const [startSignal, setStartSignal] = useState(false)
    const [clearSignal, setClearSignal] = useState(false)
    const [drag, setDrag] = useState(false)
    const [showNew, setShowNew] = useState(false)
    const [ignored, forceUpdate] = useReducer(x => x + 1, 0)
    const progressBarRef = useRef(null) as React.RefObject<HTMLDivElement>
    const fileContainerRef = useRef(null) as React.RefObject<HTMLElement>

    useEffect(() => {
        const conversionStarted = (event: any, info: {id: number}) => {
            if (info.id === props.id) {
                setStarted(true)
                props.setStart(props.id)
            }
        }
        const conversionProgress = (event: any, info: {id: number, current: number, total: number, frame: string, percent?: number}) => {
            if (info.id === props.id) {
                const newProgress = info.percent ? info.percent : (info.current / info.total) * 100
                if (progress !== newProgress) {
                    setProgress(newProgress)
                    if (info.frame) {
                        setFrame(info.frame)
                        setFrames(`${info.current} / ${info.total}`)
                    }
                }
            }
        }
        const interpolationProgress = (event: any, info: {id: number, percent?: number}) => {
            if (info.id === props.id) {
                const newProgress = info.percent
                if (interlopProgress !== newProgress) {
                    if (newProgress) setInterlopProgress(newProgress)
                }
            }
        }
        const conversionFinished = (event: any, info: {id: number, output: string, outputImage?: string}) => {
            if (info.id === props.id) {
                setOutput(info.output)
                if (info.outputImage) setOutputImage(info.outputImage)
                setFrame("")
                setShowNew(true)
            }
        }
        const startAll = () => {
            setStartSignal(true)
        }
        const clearAll = () => {
            setClearSignal(true)
        }
        const checkMouseStop = () => {
            mouseStopped = false
            clearTimeout(timer)
            timer =  setTimeout(() => {mouseStopped = true}, 200)
        }
        ipcRenderer.on("conversion-started", conversionStarted)
        ipcRenderer.on("conversion-progress", conversionProgress)
        ipcRenderer.on("interpolation-progress", interpolationProgress)
        ipcRenderer.on("conversion-finished", conversionFinished)
        ipcRenderer.on("start-all", startAll)
        ipcRenderer.on("clear-all", clearAll)
        ipcRenderer.on("update-color", forceUpdate)
        window.addEventListener("mousemove", checkMouseStop)
        return () => {
            ipcRenderer.removeListener("conversion-started", conversionStarted)
            ipcRenderer.removeListener("conversion-progress", conversionProgress)
            ipcRenderer.removeListener("interpolation-progress", interpolationProgress)
            ipcRenderer.removeListener("conversion-finished", conversionFinished)
            ipcRenderer.removeListener("start-all", startAll)
            ipcRenderer.removeListener("clear-all", clearAll)
            ipcRenderer.removeListener("update-color", forceUpdate)
            window.removeEventListener("mousemove", checkMouseStop)
        }
    }, [])

    useEffect(() => {
        updateProgressColor()
        updateBackgroundColor()
        if (!started && startSignal) startConversion(true)
        if ((!started || output) && clearSignal) closeConversion()
    })

    const startConversion = (startAll?: boolean) => {
        if (started) return
        setStartSignal(false)
        let fps = props.framerate! * fpsMultiplier
        const quality = props.type === "gif" ? gifQuality : videoQuality
        ipcRenderer.invoke("upscale", {id: props.id, source: props.source, dest: directory, type: props.type, framerate: fps, pitch, scale, noise, 
        mode, fpsMultiplier, speed, reverse, quality, rename, pngCompression, jpgQuality, parallelFrames, threads, upscaler, compress, gifTransparency, 
        sdColorSpace, pngFrames, pdfDownscale, pythonDownscale}, startAll)
        setLockedStats({framerate: fps, noise, scale, mode, speed, reverse})
        if (!startAll) {
            setStarted(true)
            props.setStart(props.id)
        }
    }

    const closeConversion = () => {
        ipcRenderer.invoke("move-queue", props.id)
        if (!output) ipcRenderer.invoke("delete-conversion", props.id)
        props.remove(props.id)
    }

    const deleteConversion = async () => {
        if (deleted) return
        const success = await ipcRenderer.invoke("delete-conversion", props.id, true)
        if (success) {
            ipcRenderer.invoke("move-queue")
            setDeleted(true)
        }
    }

    const stopConversion = async () => {
        if (stopped) return
        if (output || progress >= 99) return
        const success = await ipcRenderer.invoke("stop-conversion", props.id)
        if (success) {
            ipcRenderer.invoke("move-queue")
            setStopped(true)
        }
    }

    const updateBackgroundColor = async () => {
        const colors = ["#2c9bf6", "#4d7fff", "#4f5eff", "#3b7cff", "#2b92ff", "#47a6ff"]
        const container = fileContainerRef.current?.querySelector(".file-container") as HTMLElement
        if (!container) return
        if (!backgroundColor) {
            const color = colors[Math.floor(Math.random() * colors.length)]
            setBackgroundColor(color)
        }
        const theme = await ipcRenderer.invoke("get-theme")
        if (theme === "light") {
            const text = fileContainerRef.current?.querySelectorAll(".file-text, .file-text-alt") as NodeListOf<HTMLElement>
            text.forEach((t) => {
                t.style.color = "black"
            })
            container.style.backgroundColor = backgroundColor
            container.style.border = `4px solid ${pSBC(0.1, backgroundColor)}`
        } else {
            const text = fileContainerRef.current?.querySelectorAll(".file-text, .file-text-alt") as NodeListOf<HTMLElement>
            text.forEach((t) => {
                t.style.color = backgroundColor
            })
            container.style.backgroundColor = "#090409"
            container.style.border = `4px solid #090409`
        }
    }

    const updateProgressColor = () => {
        const colors = ["#4684f8", "#2b59ff", "#8e2bff", "#592bff", "#2baeff", "#2b6bff", "#2bf4ff", "#2ba7ff"]
        const progressBar = progressBarRef.current?.querySelector(".progress-bar") as HTMLElement
        if (started && !progressLock) {
            setProgressColor(colors[Math.floor(Math.random() * colors.length)])
            setProgressLock(true)
        }
        if (output) setProgressColor("#2bffb5")
        if (stopped) setProgressColor("#ff2495")
        if (deleted) setProgressColor("#5b3bff")
        progressBar.style.backgroundColor = progressColor
    }

    const generateProgressBar = () => {
        let jsx = <p className="file-text-progress black">Waiting...</p>
        let progressJSX = <ProgressBar ref={progressBarRef} animated now={100}/>
        if (started) {
            jsx = <p className="file-text-progress black">{props.type !== "image" ? "Processing..." : "Upscaling..."}</p>
            progressJSX = <ProgressBar ref={progressBarRef} animated now={100}/>
        }
        if (progress !== null) {
            jsx = <p className="file-text-progress">Upscaling... {progress.toFixed(2)}%</p>
            progressJSX = <ProgressBar ref={progressBarRef} animated now={progress}/>
        }
        if (interlopProgress !== null) {
            jsx = <p className="file-text-progress">Interpolating... {interlopProgress.toFixed(2)}%</p>
            progressJSX = <ProgressBar ref={progressBarRef} animated now={interlopProgress}/>
        }
        if (fpsMultiplier !== 1 && props.type === "video") {
            if (interlopProgress === 100) {
                jsx = <p className="file-text-progress black">Finalizing...</p>
                progressJSX = <ProgressBar ref={progressBarRef} animated now={100}/>
            }
        } else {
            if (progress === 100) {
                jsx = <p className="file-text-progress black">Finalizing...</p>
                progressJSX = <ProgressBar ref={progressBarRef} animated now={100}/>
            }
        }
        if (output) {
            jsx = <p className="file-text-progress black">Finished</p>
            progressJSX = <ProgressBar ref={progressBarRef} animated now={100}/>
        }
        if (stopped) {
            jsx = <p className="file-text-progress black">Stopped</p>
            progressJSX = <ProgressBar ref={progressBarRef} animated now={100}/>
        }
        if (deleted) {
            jsx = <p className="file-text-progress black">Deleted</p>
            progressJSX = <ProgressBar ref={progressBarRef} animated now={100}/>
        }
        return (
            <>
            <div className="file-text-progress-container">{jsx}</div>
            {progressJSX}
            </>
        )
    }

    const mouseEnter = () => {
        document.documentElement.style.setProperty("--selection-color", pSBC(0.5, backgroundColor))
    }

    const mouseLeave = () => {
        setHover(false)
        document.documentElement.style.setProperty("--selection-color", "#b5d7ff")
    }

    const preview = (event: React.MouseEvent<HTMLElement>) => {
        const source = getSource()
        if (event.ctrlKey) return ipcRenderer.invoke("add-file", source, props.id)
        if (event.button === 2 && !drag) {
            if (frame) return ipcRenderer.invoke("preview", frame, "image")
            ipcRenderer.invoke("preview", source, props.type)
        }
    }

    const toggleNew = () => {
        if (output) setShowNew((prev) => !prev)
    }

    const delayPress = (event: React.MouseEvent<HTMLElement>) => {
        setDrag(previewVisible)
        if (event.button === 2) {
            return event.stopPropagation()
        } else {
            return
        }
        const {target, nativeEvent} = event
        const cloned =  new MouseEvent("mousedown", nativeEvent)
        if (!realEvent || !mouseStopped) {
            realEvent = true
            return
        }
        event.stopPropagation()
        setTimeout(() => {
            realEvent = false
            target.dispatchEvent(cloned)
        }, 200)
    }

    const openLocation = (direct?: boolean) => {
        const location = showNew ? output : props.source
        if (!fs.existsSync(location)) return
        if (direct) {
            shell.openPath(path.normalize(location))
        } else {
            shell.showItemInFolder(path.normalize(location))
        }
    }

    const getSource = () => {
        if (props.type === "pdf") return showNew ? outputImage : props.image
        return showNew ? output : props.source
    }

    const getThumbnail = () => {
        if (props.type === "video") {
            if (frame) return <img className="file-img" onMouseDown={delayPress} onMouseUp={preview} src={frame}/>
            return <video className="file-img" onMouseDown={delayPress} onMouseUp={preview} muted autoPlay loop><source src={getSource()}></source></video>
        } else {
            if (frame) return <img className="file-img" onMouseDown={delayPress} onMouseUp={preview} src={frame}/>
            return <img className="file-img" onMouseDown={delayPress} onMouseUp={preview} src={getSource()}/>
        }
    }

    const calcWidth = (final?: boolean) => {
        if (final) {
            if (props.type === "pdf" && pdfDownscale && Number(pdfDownscale) > 0) {
                return Math.floor(((props.width / props.height) * pdfDownscale) * (started ? lockedStats.scale : scale))
            }
            return Math.floor(props.width * (started ? lockedStats.scale : scale))
        } else {
            if (props.type === "pdf" && pdfDownscale && Number(pdfDownscale) > 0) return Math.floor((props.width / props.height) * pdfDownscale)
            return props.width
        }
    }

    const calcHeight = (final?: boolean) => {
        if (final) {
            if (props.type === "pdf" && pdfDownscale && Number(pdfDownscale) > 0) {
                return Math.floor(pdfDownscale * (started ? lockedStats.scale : scale))
            }
            return Math.floor(props.height * (started ? lockedStats.scale : scale))
        } else {
            if (props.type === "pdf" && pdfDownscale && Number(pdfDownscale) > 0) return pdfDownscale
            return props.height
        }
    }

    return (
        <section ref={fileContainerRef} className="file-wrap-container" onMouseOver={() => setHover(true)} onMouseEnter={mouseEnter} onMouseLeave={mouseLeave}>
            <div className="file-container" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} onMouseDown={() => setDrag(false)} onMouseMove={() => setDrag(true)}>
            <div className="file-img-container">
                {getThumbnail()}
            </div>
            <div className="file-middle">
                <div className="file-group-top">
                    <div className="file-name">
                        <p className="file-text bigger"><span className="hover" onClick={() => openLocation(true)}>{functions.cleanTitle(path.basename(props.source))}</span></p>
                        <img className="file-expand" onMouseDown={(event) => event.stopPropagation()} width="20" height="20" onClick={toggleNew} src={showNew ? contract : expand}/>
                    </div>
                    <div className="file-info">
                            <p className="file-text" onMouseDown={(event) => event.stopPropagation()}>{calcWidth()}x{calcHeight()}</p>
                            <img className="file-arrow" width="25" height="25" src={arrow} onMouseDown={(event) => event.stopPropagation()}/>
                            <p className="file-text" onMouseDown={(event) => event.stopPropagation()}>{calcWidth(true)}x{calcHeight(true)}</p>
                    </div>
                    <div className="file-info">
                            <p className="file-text" onMouseDown={(event) => event.stopPropagation()}>Noise: {started ? lockedStats.noise : noise}</p>
                            <p className="file-text margin-left" onMouseDown={(event) => event.stopPropagation()}>Scale: {started ? lockedStats.scale : scale}</p>
                            {/*<p className="file-text margin-left" onMouseDown={(event) => event.stopPropagation()}>Mode: {started ? lockedStats.mode : mode}</p>*/}
                    </div>
                    {props.type !== "image" ?
                    <div className="file-info-col-container">
                        <div className="file-info-col">
                            <div className="file-info">
                                {props.framerate ? <p className="file-text" onMouseDown={(event) => event.stopPropagation()}>Framerate: {started ? lockedStats.framerate : props.framerate * fpsMultiplier}</p> : null}
                                <p className="file-text margin-left" onMouseDown={(event) => event.stopPropagation()}>Speed: {started ? lockedStats.speed : speed}</p>
                                <p className="file-text margin-left" onMouseDown={(event) => event.stopPropagation()}>Reverse: {started ? (lockedStats.reverse ? "yes" : "no") : (reverse ? "yes" : "no")}</p>
                            </div>
                        </div>
                        <div className="file-info-col">
                            <p className="file-text-alt" onMouseDown={(event) => event.stopPropagation()}>{frames}</p>
                        </div>
                    </div> : null}
                </div>
                <div className="file-progress">
                    {generateProgressBar()}
                </div>
            </div>
            <div className="file-buttons">
                {hover ? <img className="file-button close-container" width="28" height="28" onMouseDown={(event) => event.stopPropagation()} src={hoverClose ? closeContainerHover : closeContainer} onClick={closeConversion} onMouseEnter={() => setHoverClose(true)} onMouseLeave={() => setHoverClose(false)}/> : null}
                <div className="file-button-row">
                    <img className="file-button start-button" width="129" height="36" onMouseDown={(event) => event.stopPropagation()} onClick={() => {started ? stopConversion() : startConversion()}} src={started ? (hoverStop ? stopButtonHover : stopButton) : (hoverStart ? startButtonHover : startButton)} onMouseEnter={() => {setHoverStart(true); setHoverStop(true)}} onMouseLeave={() => {setHoverStart(false); setHoverStop(false)}}/>
                </div>
                <div className="file-button-row">
                    {output ? <img className="file-button" width="50" height="50" onMouseDown={(event) => event.stopPropagation()} src={hoverLocation ? locationButtonHover : locationButton} onClick={() => openLocation()} onMouseEnter={() => setHoverLocation(true)} onMouseLeave={() => setHoverLocation(false)}/> : null}
                    {output ? <img className="file-button" width="50" height="50" onMouseDown={(event) => event.stopPropagation()} src={hoverTrash ? trashButtonHover : trashButton} onClick={deleteConversion} onMouseEnter={() => setHoverTrash(true)} onMouseLeave={() => setHoverTrash(false)}/> : null}
                </div>
            </div>
            </div>
        </section>
    )
}

export default FileContainer
