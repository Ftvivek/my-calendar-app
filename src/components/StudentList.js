import React from 'react';
import './StudentList.css';

const StudentList = ({ selectedDate, students, onClose, onPaymentStatusChange, onSuspensionStatusChange }) => {
  if (!selectedDate) {
    return null;
  }

  const formattedDate = selectedDate.toLocaleDateString();

  const studentsOnDate = students.filter(student => {
    return student.admissionDate && new Date(student.admissionDate).toDateString() === selectedDate.toDateString();
  });

  return (
    <div className="student-list-overlay">
      <div className="student-list-container complete-page">
        <div className="student-list-header">
          <h2>Students Admitted on {formattedDate}</h2>
          <button onClick={onClose} className="close-button">X</button>
        </div>
        {studentsOnDate.length > 0 ? (
          <ul className="student-list">
            {studentsOnDate.map((student) => (
              <li key={student.id || Math.random()}> {/* Ensure each student has a unique ID */}
                <div className="student-info">
                  {student.name} {student.grade ? `(Grade: ${student.grade})` : ''}
                </div>
                <div className="student-actions">
                  <div className="payment-status">
                    <label>
                      Paid:
                      <input
                        type="checkbox"
                        checked={student.paymentStatus === 'paid'}
                        onChange={(e) => onPaymentStatusChange(student.id, e.target.checked ? 'paid' : 'pending')}
                      />
                    </label>
                  </div>
                  <div className="suspension-status">
                    <label>
                      Suspend:
                      <input
                        type="checkbox"
                        checked={student.isSuspended}
                        onChange={(e) => onSuspensionStatusChange(student.id, e.target.checked)}
                      />
                    </label>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="no-students">No students admitted on this date.</p>
        )}
        {studentsOnDate.some(student => student.paymentStatus === 'paid') && (
          <div className="paid-students-list">
            <h3>Paid Students:</h3>
            <ul>
              {studentsOnDate.filter(student => student.paymentStatus === 'paid').map(student => (
                <li key={student.id || Math.random()}>{student.name}</li>
              ))}
            </ul>
          </div>
        )}
        {studentsOnDate.some(student => student.isSuspended) && (
          <div className="suspended-students-list">
            <h3>Suspended Students:</h3>
            <ul>
              {studentsOnDate.filter(student => student.isSuspended).map(student => (
                <li key={student.id || Math.random()}>{student.name}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentList;