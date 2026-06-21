export function launchImageLibrary(options, callback) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = options.mediaType === 'photo' ? 'image/*' : '*/*';
  if (options.selectionLimit === 0) {
    input.multiple = true;
  }

  input.onchange = () => {
    const assets = Array.from(input.files).map((file) => ({
      uri: URL.createObjectURL(file),
      type: file.type,
      fileName: file.name,
      fileSize: file.size,
    }));

    if (input.multiple) {
      callback({ didCancel: false, assets });
    } else {
      callback({ didCancel: false, assets: [assets[0]] });
    }
  };

  input.click();
}

export function launchCamera(options, callback) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.capture = 'environment';

  input.onchange = () => {
    if (input.files?.[0]) {
      const file = input.files[0];
      callback({
        didCancel: false,
        assets: [{
          uri: URL.createObjectURL(file),
          type: file.type,
          fileName: file.name,
          fileSize: file.size,
        }],
      });
    } else {
      callback({ didCancel: true });
    }
  };

  input.click();
}
