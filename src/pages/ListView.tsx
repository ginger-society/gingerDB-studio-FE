import { useState, useEffect, useContext } from "react";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  DocumentData,
  query,
  where,
  doc,
} from "firebase/firestore";
import { db } from "@/shared/firebase";

import { pencilIcon } from "@/shared/svgIcons";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "@/shared/AuthContext";
import Header from "@/components/atoms/Header";
import { Button } from "@ginger-society/ginger-ui";

interface Document {
  id: string;
  name: string;
  description: string;
  userId: string;
}

export const DocumentsList: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const fetchSchemas = async () => {
    if (!user) {
      return;
    }
    try {
      const userId = user.uid;
      const querySnapshot = await getDocs(
        query(collection(db, "databaseSchema"), where("userId", "==", userId)),
      );
      const docs: Document[] = querySnapshot.docs.map((doc) => {
        const data = doc.data() as DocumentData;
        return {
          id: doc.id,
          name: data.name || "",
          description: data.description || "",
          userId: data.userId || "",
        };
      });
      setDocuments(docs);
      setLoading(false);
    } catch (err: any) {
      console.error("Error fetching documents: ", err);
    }
  };

  useEffect(() => {
    fetchSchemas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const insertOrUpdateDocument = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) return;
    const userId = user.uid;
    try {
      if (!userId) throw new Error("User not authenticated");

      if (editingDocId) {
        // Update existing document
        const docRef = doc(db, "databaseSchema", editingDocId);
        await updateDoc(docRef, { name, description });

        // Update local state
        setDocuments((prevDocs) =>
          prevDocs.map((doc) =>
            doc.id === editingDocId ? { ...doc, name, description } : doc,
          ),
        );
      } else {
        // Insert new document
        const docData: Omit<Document, "id"> = {
          name,
          description,
          userId,
        };
        await addDoc(collection(db, "databaseSchema"), docData);

        // Fetch documents again to update the list
        const querySnapshot = await getDocs(
          query(
            collection(db, "databaseSchema"),
            where("userId", "==", userId),
          ),
        );
        const docs: Document[] = querySnapshot.docs.map((doc) => {
          const data = doc.data() as DocumentData;
          return {
            id: doc.id,
            name: data.name || "",
            description: data.description || "",
            userId: data.userId || "",
          };
        });
        setDocuments(docs);
      }

      // Reset form
      setName("");
      setDescription("");
      setEditingDocId(null);
      setDialogOpen(false); // Close dialog
    } catch (err: any) {
      console.error("Error adding or updating document: ", err);
    }
  };

  const handleEdit = (doc: Document) => {
    setName(doc.name);
    setDescription(doc.description);
    setEditingDocId(doc.id);
    setDialogOpen(true); // Open dialog for editing
  };

  const openDesigner = (doc: Document) => {
    console.log(doc);
    navigate(`/editor/${doc.id}`);
  };

  return (
    <div>
      <Header />
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div style={{ marginTop: "80px", padding: "20px" }}>
          <button
            className="base-button primary"
            onClick={() => {
              setName("");
              setDescription("");
              setEditingDocId(null);
              setDialogOpen(true);
            }}
          >
            Create Schema
          </button>

          <ul className="schema-list-container">
            {documents.map((doc) => (
              <li
                key={doc.id}
                className="card schema-item"
                onClick={() => openDesigner(doc)}
              >
                <div className="schema-item-container">
                  <span
                    className="edit-cta"
                    onClick={(e) => {
                      handleEdit(doc);
                      e.stopPropagation();
                    }}
                  >
                    {pencilIcon("black")}
                  </span>
                  <div className="schema-item">
                    <h1>{doc.name}</h1>
                    <p>{doc.description}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {dialogOpen && (
        <div className="modal-overlay" onClick={() => setDialogOpen(false)}>
          <dialog
            open={dialogOpen}
            className="modal"
            onClick={(e) => e.stopPropagation()}
          >
            <form onSubmit={insertOrUpdateDocument}>
              <div className="form-group">
                <label>Name</label>
                <input
                  type="text"
                  id="name"
                  className="base-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  id="description"
                  className="base-input"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
              </div>
              <div className="btn-group">
                <button type="submit" className="base-button primary">
                  {editingDocId ? "Update" : "Create"}
                </button>
                <button
                  type="button"
                  onClick={() => setDialogOpen(false)}
                  className="base-button secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          </dialog>
        </div>
      )}
    </div>
  );
};
