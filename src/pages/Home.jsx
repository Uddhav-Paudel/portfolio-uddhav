import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import { FaGithub, FaLinkedin } from "react-icons/fa"; // Import GitHub and LinkedIn icons
import "github-markdown-css/github-markdown.css";

const Home = () => {
  const [repos, setRepos] = useState([]);
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [readmeContent, setReadmeContent] = useState("");

  useEffect(() => {
    // Fetch public repositories from GitHub
    fetch("https://api.github.com/users/uddhav-paudel/repos")
      .then((response) => response.json())
      .then((data) => {
        setRepos(data);
        if (data.length > 0) {
          setSelectedRepo(data[0]); // Select the first project by default
        }
      })
      .catch((error) => console.error("Error fetching repos:", error));
  }, []);

  useEffect(() => {
    if (selectedRepo) {
      // Fetch the README file for the selected repository
      fetch(
        `https://raw.githubusercontent.com/${selectedRepo.owner.login}/${selectedRepo.name}/main/README.md`
      )
        .then((response) => {
          if (response.ok) return response.text();
          else throw new Error("README not found");
        })
        .then((data) => setReadmeContent(data))
        .catch(() => setReadmeContent("README file not available."));
    }
  }, [selectedRepo]);

  return (
    <div className="flex h-screen p-primary">
      <div className="w-1/3 me-primary bg-gray-100 p-primary pt-0 border border-gray-300 overflow-y-auto">
        {/* Sticky Header for Left Panel */}
        <div className="sticky mb-primary top-0 bg-gray-100 z-10 p-primary border-b border-gray-300 flex justify-between items-center">
          <h2 className="text-xl font-bold">Projects</h2>
          <a
            href="https://www.linkedin.com/in/paudel-uddhav"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:text-blue-700"
          >
            <FaLinkedin size={24} />
          </a>
        </div>
        <ul className="space-y-4">
          {repos.map((repo) => (
            <li
              key={repo.id}
              className={`p-2 shadow rounded cursor-pointer ${
                selectedRepo?.id === repo.id
                  ? "bg-blue-100"
                  : "bg-white hover:bg-gray-200"
              }`}
              onClick={() => setSelectedRepo(repo)}
            >
              <div className="font-bold">{repo.name}</div>
              {repo.topics && repo.topics.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {repo.topics.map((topic, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 text-xs bg-blue-200 text-blue-800 rounded-full"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
      <div className="w-2/3 p-primary pt-0 overflow-y-auto border border-gray-300">
        <div className="p-primary pt-1">
          {selectedRepo ? (
            <>
              {/* Sticky Header */}
              <div className="sticky top-0 bg-gray-50 z-1 p-primary border-b border-gray-300 flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold capitalize">
                    {selectedRepo.name}
                  </h2>
                  {selectedRepo.homepage && (
                    <a
                      href={selectedRepo.homepage}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:text-blue-700 text-sm"
                    >
                      Visit Live URL
                    </a>
                  )}
                </div>
                <a
                  href={selectedRepo.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:text-blue-700"
                >
                  <FaGithub size={24} />
                </a>
              </div>
              {/* Content */}
              <div className="p-primary">
                <p className="mb-primary">
                  {selectedRepo.description || "No description available."}
                </p>
                <hr className="my-4 border-gray-300" />
                <h3 className="text-lg font-bold mb-2">README</h3>
                <div className="markdown-body">
                  <ReactMarkdown
                    children={readmeContent}
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeRaw]}
                  />
                </div>
              </div>
            </>
          ) : (
            <p>Select a project to view details.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Home;
