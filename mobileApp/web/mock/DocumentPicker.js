const DocumentPicker = {
  pickDirectory: async () => {
    throw { code: "DOCUMENT_PICKER_CANCELED" };
  },
  isCancel: (err) => err?.code === "DOCUMENT_PICKER_CANCELED",
  types: {
    allFiles: "*/*",
  },
};

export default DocumentPicker;
