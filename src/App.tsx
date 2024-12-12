import React, { useState, useEffect, ChangeEvent } from "react";

enum ThemeEnum {
  Light = "light",
  Dark = "dark",
  System = "system",
}
interface Settings {
  theme: ThemeEnum;
  uri: string;
  dbName: string;
  collectionName: string;
}

function App() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<object | string>();
  const [isAdvanced, setIsAdvanced] = useState(false);
  const [history, setHistory] = useState([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const [theme, setTheme] = useState<ThemeEnum>();
  const [uri, setUri] = useState<string>();
  const [dbName, setDbName] = useState<string>();
  const [collectionName, setCollectionName] = useState<string>();

  useEffect(() => {
    window.ipcRenderer.on("open-settings", () => {
      setShowSettings(true);
    });
    fetchSettings();
    fetchHistory();
  }, []);

  useEffect(() => {
    if (theme) {
      applyTheme(theme);
    }
  }, [theme]);

  useEffect(() => {
    setTheme(settings?.theme);
    setUri(settings?.uri);
    setDbName(settings?.dbName);
    setCollectionName(settings?.collectionName);
  }, [settings]);

  const fetchSettings = async () => {
    try {
      const response = await fetch("http://localhost:5001/api/settings");
      const data = await response.json();

      if (response.ok && data) {
        setSettings(data);
      } else {
        console.error(data.error || "Failed to fetch settings.");
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    }
  };

  const applyTheme = (selectedTheme: ThemeEnum) => {
    const root = document.documentElement;
    if (selectedTheme === "light") {
      root.classList.remove("dark-theme");
      root.classList.add("light-theme");
    } else if (selectedTheme === "dark") {
      root.classList.remove("light-theme");
      root.classList.add("dark-theme");
    } else if (selectedTheme === "system") {
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;
      if (prefersDark) {
        root.classList.remove("light-theme");
        root.classList.add("dark-theme");
      } else {
        root.classList.remove("dark-theme");
        root.classList.add("light-theme");
      }
    }
  };

  const handleThemeChange = (e: ChangeEvent<HTMLInputElement>) => {
    setTheme(e.target.value as ThemeEnum);
  };

  const handleSettingsClose = () => {
    setTheme(settings?.theme);
    setUri(settings?.uri);
    setDbName(settings?.dbName);
    setCollectionName(settings?.collectionName);
    setShowSettings(false);
  };

  async function updateSettings(settingsData: Settings) {
    try {
      const response = await fetch("http://localhost:5001/api/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settingsData),
      });

      setSettings(settingsData);

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      setShowSettings(false);
    } catch (error) {
      if (error instanceof Error) {
        console.error("Request failed:", error.message);
      } else {
        console.error("Unknown error occurred", error);
      }
    }
  }

  const handleQuerySubmit = async () => {
    try {
      const parsedQuery = JSON.parse(query); // Parse the query from the text input
      // Make a POST request to the backend
      const response = await fetch("http://localhost:5001/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: parsedQuery }),
      });

      if (!response.ok) {
        throw new Error("Query execution failed");
      }

      const data = await response.json(); // Parse the response data
      setResult(data); // Set the result to the state for display
      addQueryToHistory(parsedQuery, data);
    } catch (error) {
      const errorResult = { error: "Invalid query or server error." };
      console.log({ error });
      setResult(errorResult);
      addQueryToHistory(query, "Invalid query or server error.");
    }
  };

  const handleHistoryItemClick = (item: { query: string; output: string }) => {
    setQuery(item.query);
    setResult(JSON.parse(item.output));
  };

  const addQueryToHistory = async (parsedQuery: string, result: string) => {
    try {
      await fetch("http://localhost:5001/api/queries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: parsedQuery,
          output: result,
        }),
      });
      fetchHistory();
    } catch (error) {
      console.log({ error });
    }
  };

  const fetchHistory = async () => {
    const response = await fetch("http://localhost:5001/api/queries");
    const data = await response.json();
    if (data.success) {
      setHistory(data.queries);
    } else {
      console.error(data.error);
    }
  };

  if (!settings) return;

  return (
    <div className="app-content">
      {showSettings && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Settings</h5>
                <button
                  type="button"
                  className="close"
                  onClick={handleSettingsClose}
                >
                  <span>&times;</span>
                </button>
              </div>
              <div className="modal-body">
                <h5>Select Theme</h5>
                <div className="form-group">
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="radio"
                      name="themeOptions"
                      id="lightTheme"
                      value="light"
                      defaultChecked={settings.theme === "light"}
                      onChange={handleThemeChange}
                    />
                    <label className="form-check-label" htmlFor="lightTheme">
                      Light
                    </label>
                  </div>
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="radio"
                      name="themeOptions"
                      id="darkTheme"
                      value="dark"
                      defaultChecked={settings.theme === "dark"}
                      onChange={handleThemeChange}
                    />
                    <label className="form-check-label" htmlFor="darkTheme">
                      Dark
                    </label>
                  </div>
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="radio"
                      name="themeOptions"
                      id="systemTheme"
                      value="system"
                      defaultChecked={settings.theme === "system"}
                      onChange={handleThemeChange}
                    />
                    <label className="form-check-label" htmlFor="systemTheme">
                      As in System
                    </label>
                  </div>
                </div>
                <h5>Database Settings</h5>
                <div className="form-group">
                  <label htmlFor="uriInput">URI</label>
                  <input
                    type="text"
                    id="uriInput"
                    className="form-control mb-2"
                    value={uri}
                    onChange={(e) => setUri(e.target.value)}
                  />
                  <label htmlFor="dbNameInput">Database Name</label>
                  <input
                    type="text"
                    id="dbNameInput"
                    className="form-control mb-2"
                    value={dbName}
                    onChange={(e) => setDbName(e.target.value)}
                  />
                  <label htmlFor="collectionNameInput">Collection Name</label>
                  <input
                    type="text"
                    id="collectionNameInput"
                    className="form-control mb-2"
                    value={collectionName}
                    onChange={(e) => setCollectionName(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleSettingsClose}
                >
                  Cancel
                </button>
                <div className="ml-2 mr-2" style={{ width: "20px" }}></div>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() =>
                    updateSettings({
                      theme,
                      uri,
                      dbName,
                      collectionName,
                    } as Settings)
                  }
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="titlebar">MongoDB Query Executor</div>
      <div className="app-body">
        <div className="app-top">
          <div className="col-md-8">
            <div className="form-check form-switch">
              <input
                className="form-check-input"
                type="checkbox"
                role="switch"
                id="flexSwitchCheckDefault"
                checked={isAdvanced}
                onChange={() => setIsAdvanced(!isAdvanced)}
              />
              <label
                className="form-check-label"
                htmlFor="flexSwitchCheckDefault"
              >
                Advanced view
              </label>
            </div>
          </div>
        </div>
        <h1 className="text-center mb-4">MongoDB Query Executor</h1>

        <div className="app-bottom">
          <div className="app-action">
            <div className={`card shadow-sm ${isAdvanced ? "sticky-top" : ""}`}>
              <div className="card-body">
                <h5 className="card-title">Enter MongoDB Query</h5>
                <textarea
                  className={`form-control mb-3 ${
                    theme === "dark" ? "dark-textarea" : ""
                  }`}
                  rows={6}
                  placeholder="Enter MongoDB query (e.g., { age: { $gt: 25 } })"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <button
                  className="btn btn-primary btn-block"
                  onClick={handleQuerySubmit}
                >
                  Run Query
                </button>
              </div>
            </div>
          </div>
          <div
            className={`app-res-his-wrapper ${
              isAdvanced ? "flex-row" : "flex-column"
            }`}
          >
            {result && (
              <div
                className={`app-results ${
                  !isAdvanced ? "overflow-visible" : ""
                }`}
              >
                <div className={`card shadow-sm`}>
                  <div className="card-body">
                    <h5>Query Result</h5>
                    <pre>{JSON.stringify(result, null, 2)}</pre>
                  </div>
                </div>
              </div>
            )}
            <div className="app-history">
              {isAdvanced && (
                <div className={`card shadow-sm`}>
                  <div className="card-body">
                    <h5>Query History</h5>
                    <div className="list-group">
                      {history.map(
                        (item: { query: string; output: string }, index) => (
                          <div
                            key={index}
                            className={`list-group-item list-group-item-action text-truncate ${
                              theme === "dark" ? "dark-list-group-item" : ""
                            }`}
                            onClick={() => handleHistoryItemClick(item)}
                          >
                            {`Query: ${item.query} | Result: ${item.output}`}
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
