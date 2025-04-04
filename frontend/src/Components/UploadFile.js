import React, { useState } from "react";
import axios from "axios";
import 'bootstrap/dist/css/bootstrap.min.css';



export const UploadFile = ({ userId }) => {
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploadStatus, setUploadStatus] = useState("");
    const [fileType, setFileType] = useState("");

    const handleFileChange = (event) => {
        setSelectedFile(event.target.files[0]);
    };
    const handleTypeChange = (event) => {
        setFileType(event.target.value);
    };

    const handleFileUpload = async () => {
        if (!selectedFile) {
            setUploadStatus("No file selected.");
            return;
        }
        if (!fileType) {
            setUploadStatus("Please select a file type.");
            return;
        }

        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("fileType", fileType);

        try {
            const response = await axios.post(`http://localhost:8000/uploadfile/${userId}`, formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            });
            if (response.status === 200) {
                setUploadStatus("File uploaded successfully.");
            } else {
                setUploadStatus("Failed to upload file.");
            }
        } catch (error) {
            setUploadStatus("Error uploading file.");
        }
    };

    return (
        <div className="container mt-5">
            <h1 className="text-center mb-4">העלאת קובץ</h1>
            <div className="card p-4 shadow-sm">
                <div className="mb-3">
                    <label className="form-label">בחר קובץ</label>
                    <input type="file" className="form-control" onChange={handleFileChange} />
                </div>
                <div className="mb-3">
                    <label className="form-label">בחר סוג קובץ</label>
                    <select className="form-select" onChange={handleTypeChange} value={fileType}>
                        <option value="">בחר סוג קובץ</option>
                        <option value="miluyim">מילואים</option>
                        <option value="illness_certificate">אישור מחלה</option>
                        <option value="appeal">ערעור</option>
                    </select>
                </div>
                <button className="btn btn-primary w-100" onClick={handleFileUpload}>
                    העלאה
                </button>
                <p className="mt-3 text-center">{uploadStatus}</p>
            </div>
        </div>
    );


}
