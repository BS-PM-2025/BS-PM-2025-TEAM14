import React, { useEffect, useState } from 'react';
import axios from 'axios';
import '../CSS/UserGrades.css';
import ScoreGauge from './Gauge';

type Grade = {
    course_id: string;
    course_name?: string;
    professor_email: string;
    grade_component: string;
    grade: number;
    student_email: string;
};

type GradesByCourse = {
    [courseId: string]: Grade[];
};

interface UserGradesProps {
    userEmail: string;
}

const UserGrades: React.FC<UserGradesProps> = ({ userEmail }) => {
    const [gradesByCourse, setGradesByCourse] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchGrades = async () => {
            try {
                const response = await axios.get(`http://localhost:8000/grades/${userEmail}`);
                const grouped: GradesByCourse = {};

                response.data.forEach((grade: Grade) => {
                    if (!grouped[grade.course_id]) {
                        grouped[grade.course_id] = [];
                    }
                    grouped[grade.course_id].push(grade);
                });

                setGradesByCourse(grouped);
            } catch (error) {
                console.error('Failed to fetch grades:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchGrades();
    }, [userEmail]);

    if (loading) return <div className="grades-loading">Loading grades...</div>;

    return (
        <div className="grades-container">
            {Object.entries(gradesByCourse).map(([courseId, grades]) => {
                const courseName = grades[0].course_name ?? courseId;
                const average = (
                    grades.reduce((acc, g) => acc + g.grade, 0) / grades.length
                ).toFixed(1);

                return (
                    <div key={courseId} className="course-grade-card">
                        <div className="course-info">
                            <h3>{courseName}</h3>
                            <p>Average: {average}</p>
                        </div>
                        <ScoreGauge scoreValue={parseFloat(average)} />
                        <ul className="grade-list">
                            {grades.map((grade, index) => (
                                <li key={index} className="grade-item">
                                    <span>{grade.grade_component}:</span>
                                    <strong>{grade.grade}</strong>
                                </li>
                            ))}
                        </ul>
                    </div>
                );
            })}
        </div>
    );
};

export default UserGrades;
