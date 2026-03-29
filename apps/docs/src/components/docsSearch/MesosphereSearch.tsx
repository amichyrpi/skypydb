import BrowserOnly from "@docusaurus/BrowserOnly";
import React, { useCallback, useEffect, useState } from "react";
import Dialog from "./Dialog";
import SearchButton from "./SearchButton";

const MesosphereSearch = () => {
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleCloseDialog = useCallback(() => {
    setDialogOpen(false);
  }, []);

  // Open the search dialog with Cmd+K (Mac) or Ctrl+K (Windows/Linux)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        setDialogOpen(true);
        event.preventDefault();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <BrowserOnly>
      {() => (
        <div className="order-2 lg:order-1">
          <SearchButton onClick={() => setDialogOpen(true)} />
          <Dialog open={dialogOpen} onClose={handleCloseDialog} />
        </div>
      )}
    </BrowserOnly>
  );
};

export default MesosphereSearch;
