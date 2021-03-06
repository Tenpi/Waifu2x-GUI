import {ipcRenderer} from "electron"
import React, {useEffect, useState} from "react"
import {useDropzone} from "react-dropzone"
import fileSelectorBG from "../assets/fileSelector-bg.png"
import fileSelectorTextDrag from "../assets/fileSelector-text-drag.png"
import fileSelectorText from "../assets/fileSelector-text.png"
import functions from "../structures/functions"
import "../styles/fileselector.less"

const FileSelector: React.FunctionComponent = (props) => {
    const [hover, setHover] = useState(false)
    const [drag, setDrag] = useState(false)
    const [id, setID] = useState(1)

    useEffect(() => {
        const addFile = (event: any, file: string, pos: number) => {
            setID((prev) => {
                ipcRenderer.invoke("add-file-id", file, pos, prev)
                return prev + 1
            })
        }
        const dragOver = () => {
            functions.logoDrag(false)
            setDrag(true)
        }
        const dragLeave = () => {
            functions.logoDrag(true)
            setDrag(false)
        }
        ipcRenderer.on("add-file", addFile)
        document.addEventListener("dragover", dragOver)
        document.addEventListener("dragleave", dragLeave)
        document.addEventListener("drop", dragLeave)
        return () => {
            ipcRenderer.removeListener("add-file", addFile)
            document.removeEventListener("dragover", dragOver)
            document.removeEventListener("dragleave", dragLeave)
            document.removeEventListener("drop", dragLeave)
        }
    }, [])

    const onDrop = (files: any) => {
        files = files.map((f: any) => f.path)
        if (files[0]) {
            const identifers = []
            let counter = id
            for (let i = 0; i < files.length; i++) {
                if (!functions.getType(files[i])) continue
                identifers.push(counter)
                counter += 1
                setID((prev) => prev + 1)
            }
            ipcRenderer.invoke("add-files", files, identifers)
        }
    }

    const {getRootProps, isDragActive} = useDropzone({onDrop})

    const selectFiles = async () => {
        setHover(false)
        const files = await ipcRenderer.invoke("select-files")
        if (files[0]) {
            const identifers = []
            let counter = id
            for (let i = 0; i < files.length; i++) {
                if (!functions.getType(files[i])) continue
                identifers.push(counter)
                counter += 1
                setID((prev) => prev + 1)
            }
            ipcRenderer.invoke("add-files", files, identifers)
        }
    }

    const setFilter = drag ? isDragActive : hover
    return (
        <section className="file-selector" {...getRootProps()}>
            <div className="file-selector-img">
                <img src={drag ? fileSelectorTextDrag : fileSelectorText} className="file-selector-img-text" width="442" height="121" style={{filter: setFilter ? "invert(1)" : ""}}/>
                <img src={fileSelectorBG} className="file-selector-img-bg" width="442" height="121"/>
            </div>
            <div className="file-selector-hover" onClick={selectFiles} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}></div>
        </section>
    )
}

export default FileSelector
