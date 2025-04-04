import {useEffect, useState} from "react";
import axios from "axios";
import 'bootstrap/dist/css/bootstrap.min.css';


function ReloadFiles({ UserId }) {
    const [files, setFiles] = useState([]);
    const [filePath, setFilePath] = useState([]);

    useEffect(() => {
        const fetchFiles = async () => {
            try {
                const response = await axios.get(`http://localhost:8000/reloadFiles/${UserId}`);
                setFiles(response.data.files);
                setFilePath(response.data.file_path);
            } catch (error) {
                console.error("Error fetching files:", error);
            }
        };
        fetchFiles();
    }, [UserId]);
    useEffect(() => {
        console.log("Files:", files);
        console.log("File Paths:", filePath);
    }, [files, filePath]);

    return (
        <div className="container mt-5">
            <h2 className="text-center mb-4"> הקבצים שלך {UserId}</h2>
            <div className="list-group">
                {files.map((item, index) => (
                    <div className="list-group-item d-flex justify-content-between align-items-center" key={index}>
                        <span>{item}</span>
                        <a
                            href={`http://localhost:8000/downloadFile/${UserId}/${encodeURIComponent(filePath[index])}`}
                            download
                            className="btn btn-primary btn-sm"
                            onClick={(e) => console.log(`Downloading: ${filePath[index]}`)}
                        >
                            הורד
                        </a>
                    </div>
                ))}
            </div>
        </div>
    );

}
export default ReloadFiles;