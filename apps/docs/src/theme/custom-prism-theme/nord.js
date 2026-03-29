module.exports = {
  plain: {
    color: "#D8DEE9",
    backgroundColor: "#2E3440",
  },
  styles: [
    {
      types: ["comment", "prolog", "doctype", "cdata"],
      style: {
        color: "#636f88",
      },
    },
    {
      types: ["punctuation"],
      style: {
        color: "#81A1C1",
      },
    },
    {
      types: ["property", "tag", "constant", "symbol", "deleted", "boolean"],
      style: {
        color: "#81A1C1",
      },
    },
    {
      types: ["number"],
      style: {
        color: "#B48EAD",
      },
    },
    {
      types: ["selector", "attr-name", "string", "char", "builtin", "inserted"],
      style: {
        color: "#A3BE8C",
      },
    },
    {
      types: ["operator", "entity", "url", "variable"],
      style: {
        color: "#81A1C1",
      },
    },
    {
      types: ["atrule", "attr-value", "function", "class-name"],
      style: {
        color: "#88C0D0",
      },
    },
    {
      types: ["keyword"],
      style: {
        color: "#81A1C1",
      },
    },
    {
      types: ["regex", "important"],
      style: {
        color: "#EBCB8B",
      },
    },
    {
      types: ["important", "bold"],
      style: {
        fontWeight: "bold",
      },
    },
    {
      types: ["italic"],
      style: {
        fontStyle: "italic",
      },
    },
  ],
};
