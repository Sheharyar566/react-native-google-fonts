import axios, { AxiosError } from 'axios';
import { fonts as FontsProto } from './utils/fontsProto';
import path from 'path';
import fs from 'fs/promises';
import { type IFontData } from './types';

const Directory = FontsProto.Directory;

(async () => {
  try {
    console.log('Getting latest font directory...');
    const protoUrl = await getProtoUrl();
    console.log(`Success! Using ${protoUrl}`);

    const fontFamilies = await readFontsProtoData(protoUrl);
    console.log('Success! Got font families');

    console.log('Transforming fonts data');
    const data = transformData(fontFamilies);
    console.log('Success! Transformed data');

    console.log('Writing to JSON file');
    await fs.writeFile(path.join(process.cwd(), 'src', 'data.json'), data);
    console.log('Success! Wrote the data to JSON file');
  } catch (e) {
    console.log('Error occured: ', e);
  }
})();

/**
 * Gets the latest font directory.
 *
 * Versioned directories are hosted on the Google Fonts server. We try to fetch
 * each directory one by one until we hit the last one. We know we reached the
 * end if requesting the next version results in a 404 response.
 * Other types of failure should not occur. For example, if the internet
 * connection gets lost while downloading the directories, we just crash. But
 * that's okay for now, because the generator is only executed in trusted
 * environments by individual developers.
 */
async function getProtoUrl(initialVersion = 7) {
  let directoryVersion = initialVersion;

  const url = (version: number) => {
    const paddedVersion = version.toString().padStart(3, '0');
    return `http://fonts.gstatic.com/s/f/directory${paddedVersion}.pb`;
  };

  let didReachLatestUrl = false;

  while (!didReachLatestUrl) {
    try {
      const response = await axios(url(directoryVersion));

      if (response.status !== 200) {
        throw new Error('Got invalid status code: ' + response.status);
      }

      directoryVersion += 1;
    } catch (e) {
      if (
        e instanceof AxiosError &&
        (e.response?.status === 404 || e.status === 404)
      ) {
        didReachLatestUrl = true;
        directoryVersion -= 1;
      } else {
        throw new Error('Failed to get proto directory: ' + e);
      }
    }
  }

  return url(directoryVersion);
}

/**
 * Gets the font families using the directory url
 */
async function readFontsProtoData(url: string) {
  const { data } = await axios.get(url, { responseType: 'arraybuffer' });
  return Directory.decode(data).family;
}

/**
 * Converts received hash to string
 */
function hashToString(bytes: Uint8Array) {
  let fileName = '';

  for (let byte of bytes) {
    const convertedByte = byte.toString(16).padStart(2, '0');
    fileName += convertedByte;
  }

  return fileName;
}

/**
 * Transforms font data
 */
function transformData(
  fontFamilies: Awaited<ReturnType<typeof readFontsProtoData>>
): string {
  const data: IFontData = {};

  for (const family of fontFamilies) {
    const { fonts, name } = family;

    if (!name || !fonts) {
      throw new Error('Got no name or fonts');
    }

    data[name] = {
      normal: {},
      italic: {},
    };

    for (const font of fonts) {
      const fontWeight = font.weight?.start?.toString();
      const fontHash = font.file?.hash;

      if (!fontWeight) {
        throw new Error("Didn't get font weight");
      } else if (!fontHash) {
        throw new Error("Didn't get font hash");
      }

      const fontType = font.italic?.start ? 'italic' : 'normal';
      data[name]![fontType][fontWeight] = hashToString(fontHash);
    }
  }

  return JSON.stringify(data);
}
