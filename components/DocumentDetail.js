import React, { useState, useEffect, useRef  } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Switch, Image, Modal, ScrollView, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import RNFS from 'react-native-fs';
import DocumentPicker from 'react-native-document-picker';
import { useNavigation, useRoute } from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import CustomImageViewer from './CustomImageViewer';
import CustomAlert from './CustomAlert'; // Importación de CustomAlert
import ImageCropPicker from 'react-native-image-crop-picker';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';


import { 
  faTrashAlt, 
  faArrowLeft, 
  faEdit, 
  faLink, 
  faFilePdf, 
  faFileWord, 
  faFileExcel, 
  faFilePowerpoint, 
  faFileImage, 
  faFileAlt, 
  faFileArchive, 
  faFileVideo, 
  faFileAudio, 
  faFileCirclePlus,
  faCalendarAlt,
  faSave,
  faShareAlt,
  faTimesCircle,
  faCamera,
  faImages,
  faFile
} from '@fortawesome/free-solid-svg-icons';
import { openDocument } from './utils';
import Share from 'react-native-share';

const DocumentDetail = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { document, onGoBack } = route.params;
  const [fileType, setFileType] = useState(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [expiryDate, setExpiryDate] = useState(new Date());
  const [share, setShare] = useState(false);
  const [creationDate, setCreationDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [documentFiles, setDocumentFiles] = useState([]);
  const [isImageViewerVisible, setIsImageViewerVisible] = useState(false);
  const [currentImageUri, setCurrentImageUri] = useState(0);
  const [isActionSheetVisible, setIsActionSheetVisible] = useState(false);
  const [editingFileIndex, setEditingFileIndex] = useState(null);
  const [isPicking, setIsPicking] = useState(false);

  
  const checkAndRequestPermission = async (permission) => {
    const result = await check(permission);
    switch (result) {
      case RESULTS.UNAVAILABLE:
        Alert.alert('Permiso no disponible', 'Este permiso no está disponible en este dispositivo.');
        return false;
      case RESULTS.DENIED:
        const requestResult = await request(permission);
        return requestResult === RESULTS.GRANTED;
      case RESULTS.LIMITED:
        return true;
      case RESULTS.GRANTED:
        return true;
      case RESULTS.BLOCKED:
        Alert.alert('Permiso bloqueado', 'Debe habilitar el permiso en la configuración para usar esta función.');
        return false;
    }
  };

  const requestPermission = async (type) => {
    if (Platform.OS === 'ios') {
      if (type === 'gallery') {
        return await checkAndRequestPermission(PERMISSIONS.IOS.PHOTO_LIBRARY);
      } else if (type === 'camera') {
        return await checkAndRequestPermission(PERMISSIONS.IOS.CAMERA);
      }
    } else {
      const androidVersion = Platform.Version;
      if (type === 'gallery') {
        if (androidVersion >= 33) {
          return await checkAndRequestPermission(PERMISSIONS.ANDROID.READ_MEDIA_IMAGES);
        } else {
          return await checkAndRequestPermission(PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE);
        }
      } else if (type === 'camera') {
        return await checkAndRequestPermission(PERMISSIONS.ANDROID.CAMERA);
      } else if (type === 'files') {
        // Normalmente DocumentPicker no requiere permisos adicionales
        return true; 
      }
    }
  };

  useEffect(() => {
    const loadDocumentData = async () => {
      const filesJsonPath = `${RNFS.DocumentDirectoryPath}/assets/archivos.json`;
  
      if (await RNFS.exists(filesJsonPath)) {
        const jsonData = await RNFS.readFile(filesJsonPath);
        const filesData = JSON.parse(jsonData).archivos;
        const fileData = filesData.find(file => file.id_archivo === document.id_archivo);
  
        if (fileData) {
          setName(fileData.nombre);
          setDescription(fileData.descripcion);
          setUrl(fileData.url);
          setExpiryDate(new Date(fileData.expiryDate));
          setCreationDate(new Date(fileData.fecha_creacion).toLocaleDateString());
          setShare(fileData.share);
  
          const filesToShow = fileData.imagenes.map(fileName => `${RNFS.DocumentDirectoryPath}/DocSafe/${fileName}`);
          setDocumentFiles(filesToShow);
        } else {
          showCustomAlert('Error', 'No se encontraron los datos del documento.');
        }
      }
    };
   
  
    loadDocumentData();
  }, [document.id_archivo]);
  

  const documentNameRef = useRef(null);
  const descriptionRef = useRef(null);
  const urTextlRef = useRef(null);

  const abrirCamara = async () => {
    if (isPicking) return;
    setIsPicking(true);
  
    documentNameRef.current?.blur();
    descriptionRef.current?.blur();
    urTextlRef.current?.blur();
  
    try {
      const imagen = await ImageCropPicker.openCamera({
        cropping: true,
        freeStyleCropEnabled: true,
        includeBase64: false,
        compressImageQuality: 0.8,
      });
  
      const nombreArchivoUnico = `camera_${new Date().toISOString().replace(/[:.]/g, '-')}.jpg`;
      const filePath = imagen.path;
      const destinationPath = `${RNFS.DocumentDirectoryPath}/DocSafe/${nombreArchivoUnico}`;
      await RNFS.copyFile(filePath, destinationPath);
  
      handleFileSelection(destinationPath);
    } catch (error) {
      console.error('Error capturando la imagen con la cámara:', error);
    } finally {
      setIsPicking(false);
    }
  };
  
  const abrirGaleria = async () => {
    if (isPicking) return;
    setIsPicking(true);
  
    documentNameRef.current?.blur();
    descriptionRef.current?.blur();
    urTextlRef.current?.blur();
  
    try {
      const imagen = await ImageCropPicker.openPicker({
        cropping: true,
        freeStyleCropEnabled: true,
        includeBase64: false,
        compressImageQuality: 0.8,
      });
  
      const nombreArchivoOriginal = imagen.filename || `gallery_${new Date().toISOString().replace(/[:.]/g, '-')}.jpg`;
      const filePath = imagen.path;
      const destinationPath = `${RNFS.DocumentDirectoryPath}/DocSafe/${nombreArchivoOriginal}`;
      await RNFS.copyFile(filePath, destinationPath);
  
      handleFileSelection(destinationPath);
    } catch (error) {
      console.error('Error seleccionando la imagen de la galería:', error);
    } finally {
      setIsPicking(false);
    }
  };
  
  const abrirDocumentos = async () => {
    if (isPicking) return;
    setIsPicking(true);
  
    documentNameRef.current?.blur();
    descriptionRef.current?.blur();
    urTextlRef.current?.blur();
  
    try {
      const result = await DocumentPicker.pick({ type: [DocumentPicker.types.allFiles] });
      if (result && result[0]) {
        const fileName = result[0].name;
        const filePath = result[0].uri;
        const destinationPath = `${RNFS.DocumentDirectoryPath}/DocSafe/${fileName}`;
        await RNFS.copyFile(filePath, destinationPath);
  
        handleFileSelection(destinationPath);
      }
    } catch (error) {
      if (!DocumentPicker.isCancel(error)) {
        console.error('Error al seleccionar el archivo:', error);
      }
    } finally {
      setIsPicking(false);
    }
  };
  const handleFileSelection = (newFilePath) => {
    let updatedFiles = [...documentFiles];

    if (fileType === 'principal') {
      updatedFiles[0] = newFilePath; 
    } else if (fileType === 'secondary') {
      if (updatedFiles.length > 1) {
        updatedFiles[1] = newFilePath; 
      } else {
        updatedFiles.push(newFilePath); 
      }
    }
  
    setDocumentFiles(updatedFiles);
    setIsActionSheetVisible(false);
  };
  
  
  const handleActionSheetPress = async (option) => {
    setIsActionSheetVisible(false);
    let permissionResult;

    switch (option) {
      case 'camera':
        permissionResult = await requestPermission('camera');
        if (permissionResult) {
          abrirCamara();
        } else {
          Alert.alert('Permiso denegado', 'Se necesita acceso a la cámara para tomar fotos.');
        }
        break;
      case 'gallery':
        permissionResult = await requestPermission('gallery');
        if (permissionResult) {
          abrirGaleria();
        } else {
          Alert.alert('Permiso denegado', 'Se necesita acceso a la galería para seleccionar fotos.');
        }
        break;
      case 'files':
        // Normalmente no se necesita permiso adicional para el DocumentPicker
        abrirDocumentos();
        break;
    }
  };

  const saveDocumentData = async () => {
    if (!name.trim()) {
      showCustomAlert('Error', 'El nombre del documento es obligatorio.');
      return;
    }
  
    if (!documentFiles[0]) {
      showCustomAlert('Error', 'Debe existir un archivo principal para guardar los cambios.');
      return;
    }
  
    if (url && !validateURL(url)) {
      showCustomAlert('Error', 'La URL del documento no es válida. Asegúrate de que sea una URL válida con un dominio o subdominio.');
      return;
    }
  
    try {
      const filesJsonPath = `${RNFS.DocumentDirectoryPath}/assets/archivos.json`;
  
      if (await RNFS.exists(filesJsonPath)) {
        const jsonData = await RNFS.readFile(filesJsonPath);
        let filesData = JSON.parse(jsonData);
        const fileIndex = filesData.archivos.findIndex(file => file.id_archivo === document.id_archivo);
  
        if (fileIndex !== -1) {
          filesData.archivos[fileIndex] = {
            ...filesData.archivos[fileIndex],
            nombre: name,
            descripcion: description,
            url: url,
            expiryDate: expiryDate.toISOString(),
            share: share,
            imagenes: documentFiles.map(file => file ? file.split('/').pop() : null)
          };
  
          await RNFS.writeFile(filesJsonPath, JSON.stringify(filesData));
          showCustomAlert('Éxito', 'Datos del documento guardados correctamente.', true);
        } else {
          showCustomAlert('Error', 'No se encontraron los datos del documento.');
        }
      }
    } catch (error) {
      console.error('Error al guardar los datos del documento:', error);
      showCustomAlert('Error', 'No se pudieron guardar los datos del documento.');
    }
  };
  

  // Estado para la alerta personalizada
  const [showAlert, setShowAlert] = useState(false);
  const [alertConfig, setAlertConfig] = useState({ title: '', message: '' });
  const [navigateOnAccept, setNavigateOnAccept] = useState(false);

  const showCustomAlert = (title, message, shouldNavigate = false) => {
    setAlertConfig({ title, message });
    setShowAlert(true);
    setNavigateOnAccept(shouldNavigate);
  };

  const deleteDocument = async () => {
    try {
      const filesJsonPath = `${RNFS.DocumentDirectoryPath}/assets/archivos.json`;

      if (await RNFS.exists(filesJsonPath)) {
        const jsonData = await RNFS.readFile(filesJsonPath);
        let filesData = JSON.parse(jsonData);
        const fileIndex = filesData.archivos.findIndex(file => file.id_archivo === document.id_archivo);

        if (fileIndex !== -1) {
          filesData.archivos.splice(fileIndex, 1);
          await RNFS.writeFile(filesJsonPath, JSON.stringify(filesData));

          for (const file of documentFiles) {
            if (file) await RNFS.unlink(file);
          }

          showCustomAlert('Éxito', 'Documento eliminado correctamente.', false);
          onGoBack?.();
          navigation.goBack();
        } else {
          showCustomAlert('Error', 'No se encontraron los datos del documento.');
        }
      }
    } catch (error) {
      console.error('Error al eliminar el documento:', error);
      showCustomAlert('Error', 'No se pudo eliminar el documento.');
    }
  };

  const validateURL = (url) => {
    const pattern = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/;
    return pattern.test(url);
  };



  const handleShare = async (file) => {
    if (!file) {
      showCustomAlert('Error', 'No hay archivo para Archivar.');
      return;
    }
  
    try {
      const fileUri = `file://${file}`;
      const mimeType = getMimeType(fileUri) || '*/*';
  
      const shareOptions = {
        title: 'Archivar Documento',
        urls: [fileUri],
        message: `Documento: ${name}`,
        type: mimeType,
      };
  
      await Share.open(shareOptions);
    } catch (error) {
      console.error('Error al Archivar el documento:', error);
    }
  };
  
  const getMimeType = (fileUri) => {
    const extension = fileUri.split('.').pop().toLowerCase();
    switch (extension) {
      case 'pdf':
        return 'application/pdf';
      case 'doc':
      case 'docx':
        return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      case 'xls':
      case 'xlsx':
        return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      case 'ppt':
      case 'pptx':
        return 'application/vnd.ms-powerpoint';
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'mp3':
      case 'wav':
        return 'audio/*';
      case 'mp4':
      case 'mkv':
        return 'video/*';
      default:
        return '*/*';
    }
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setExpiryDate(selectedDate);
    }
  };

  const handleFilePress = (file, index) => {
    const isImage = /\.(jpg|jpeg|png)$/.test(file);
    if (isImage) {
      setCurrentImageUri(index);
      setIsImageViewerVisible(true);
    } else {
      openDocument(file);
    }
  };

  const deleteFile = async (file, index) => {
    try {
      if (await RNFS.exists(file)) {
        await RNFS.unlink(file);
      }
      const updatedFiles = documentFiles.filter((_, i) => i !== index);
      setDocumentFiles(updatedFiles);
      showCustomAlert('Éxito', 'Archivo eliminado correctamente.', false);
    } catch (error) {
      console.error('Error al eliminar el archivo:', error);
      showCustomAlert('Error', 'No se pudo eliminar el archivo.');
    }
  };
  

  const getFileType = (fileName) => {
    if (!fileName) return { icon: faFileAlt, color: '#6c757d' };

    const extension = fileName.split('.').pop().toLowerCase();
    switch (extension) {
      case 'pdf':
        return { icon: faFilePdf, color: '#f40000' };
      case 'doc':
      case 'docx':
        return { icon: faFileWord, color: '#1e90ff' };
      case 'xls':
      case 'xlsx':
        return { icon: faFileExcel, color: '#28a745' };
      case 'ppt':
      case 'pptx':
        return { icon: faFilePowerpoint, color: '#ff6347' };
      case 'jpg':
      case 'jpeg':
      case 'png':
        return { icon: faFileImage, color: '#ffb100' };
      case 'zip':
      case 'rar':
        return { icon: faFileArchive, color: '#f39c12' };
      case 'mp4':
      case 'mkv':
        return { icon: faFileVideo, color: '#f1c40f' };
      case 'mp3':
      case 'wav':
        return { icon: faFileAudio, color: '#8e44ad' };
      default:
        return { icon: faFileAlt, color: '#6c757d' };
    }
  };

  const renderDocumentFile = (file, index) => {
    if (!file) {
      return renderAddFileIcon(index === 0 ? 'Principal/Anverso' : 'Secundario/Reverso');
    }
  
    const { icon, color } = getFileType(file);
  
    return (
      <View key={index} style={styles.documentSection}>
        <Text style={styles.sectionLabel}>{index === 0 ? 'Principal/Anverso' : 'Secundario/Reverso'}</Text>
        <TouchableOpacity style={styles.fileContainer} onPress={() => handleFilePress(file, index)}>
          {icon === faFileImage ? (
            <Image source={{ uri: `file://${file}` }} style={styles.filePreview} />
          ) : (
            <FontAwesomeIcon icon={icon} size={50} color={color} />
          )}
        </TouchableOpacity>
        <View style={styles.iconActions}>
        <TouchableOpacity onPress={() => {
          setFileType(index === 0 ? 'principal' : 'secondary');  // Define si el archivo es principal o secundario basado en el índice
          setEditingFileIndex(index);  // Guarda el índice del archivo que se va a editar
          setIsActionSheetVisible(true);  // Abre el modal para seleccionar el nuevo archivo
        }} style={styles.iconButton}>
          <FontAwesomeIcon icon={faEdit} size={20} color="#185abd" />
        </TouchableOpacity>
        
          <TouchableOpacity onPress={() => deleteFile(file, index)} style={styles.iconButton}>
            <FontAwesomeIcon icon={faTrashAlt} size={20} color="#cc0000" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleShare(file)} style={styles.iconButton}>
            <FontAwesomeIcon icon={faShareAlt} size={20} color="#185abd" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderAddFileIcon = (label) => (
    <View style={styles.documentSection}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <TouchableOpacity
      onPress={() => {
        setFileType(label === 'Principal/Anverso' ? 'principal' : 'secondary'); // Establece si es principal o secundario
        setIsActionSheetVisible(true); // Muestra las opciones de selección de archivos
      }}
      style={styles.fileContainer}
    >
      <FontAwesomeIcon icon={faFileCirclePlus} size={50} color="#185abd" />
    </TouchableOpacity>
    </View>
  );

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIcon}>
          <FontAwesomeIcon icon={faArrowLeft} size={24} color="#fff" />
        </TouchableOpacity>
      ),
      headerRight: () => (
        <TouchableOpacity onPress={deleteDocument} style={styles.headerIcon}>
          <FontAwesomeIcon icon={faTrashAlt} size={24} color="#fff" />
        </TouchableOpacity>
      ),
      title: 'Detalles del Documento',
      headerTitleStyle: styles.headerTitle,
    });
  }, [navigation]);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Nombre del documento:</Text>
        <TextInput
          ref={documentNameRef}
          style={styles.input}
          placeholder="Nombre del documento"
          value={name}
          onChangeText={setName}
          placeholderTextColor="#9a9a9a"
        />
      </View>

      <View style={styles.filesContainer}>
        {documentFiles.length > 0
          ? documentFiles.map((file, index) => renderDocumentFile(file, index))
          : renderAddFileIcon('Principal/Anverso')}
        {documentFiles.length < 2 && renderAddFileIcon('Secundario/Reverso')}
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Comentario:</Text>
        <TextInput
          ref={descriptionRef}
          style={styles.textArea}
          placeholder="Comentario"
          value={description}
          onChangeText={setDescription}
          multiline
          placeholderTextColor="#9a9a9a"
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Sitio web de consulta del documento:</Text>
        <View style={styles.urlContainer}>
          <TextInput
            ref={urTextlRef}
            style={[styles.input, styles.urlInput]}
            placeholder="URL (Opcional)"
            value={url}
            onChangeText={setUrl}
            placeholderTextColor="#9a9a9a"/>
          <FontAwesomeIcon icon={faLink} size={24} color="#185abd" />
        </View>
      </View>
      <View style={styles.inputContainer}>
      <Text style={styles.label}>Fecha de creación:</Text>
      <Text style={styles.creationDate}>{creationDate}</Text>
    </View>
      <View style={styles.dateAndShareContainer}>
        <View style={styles.dateContainer}>
          <Text style={styles.label}>Fecha de caducidad:</Text>
          <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.datePickerButton}>
            <FontAwesomeIcon icon={faCalendarAlt} size={24} color="#185abd" style={styles.dateIcon} />
            <Text style={styles.dateText}>{expiryDate.toLocaleDateString()}</Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={expiryDate}
              mode="date"
              display="default"
              onChange={handleDateChange}
            />
          )}
        </View>
        <View style={styles.shareContainer}>
          <Text style={styles.label}>Archivar:</Text>
          <Switch
            value={share}
            onValueChange={setShare}
            trackColor={{ false: "#767577", true: "#185abd" }}
            thumbColor={share ? "#f4f3f4" : "#f4f3f4"}
          />
        </View>
      </View>

      <TouchableOpacity style={styles.saveButton} onPress={saveDocumentData}>
        <FontAwesomeIcon icon={faSave} size={24} color="#fff" />
        <Text style={styles.saveButtonText}>Guardar</Text>
      </TouchableOpacity>
      <Modal visible={isImageViewerVisible} transparent={true} animationType="slide">
    <CustomImageViewer
        visible={isImageViewerVisible}
        images={documentFiles.filter(file => /\.(jpg|jpeg|png)$/.test(file)).map(file => ({ uri: `file://${file}` }))}
        initialIndex={currentImageUri}
        onClose={() => setIsImageViewerVisible(false)}
        documentName={name}
    />
    </Modal>
    
      <Modal visible={isActionSheetVisible} transparent={true} animationType="slide">
      <View style={styles.modalContainer}>
        <View style={styles.actionSheet}>
          <TouchableOpacity onPress={() => setIsActionSheetVisible(false)} style={styles.closeButton}>
            <FontAwesomeIcon icon={faTimesCircle} size={24} color="#999" />
          </TouchableOpacity>
          <View style={styles.optionsContainer}>
          <TouchableOpacity onPress={() => handleActionSheetPress('camera')}>
          <FontAwesomeIcon icon={faCamera} size={40} color="#185abd" />
          <Text style={styles.optionText}>Cámara</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleActionSheetPress('gallery')}>
          <FontAwesomeIcon icon={faImages} size={40} color="#185abd" />
          <Text style={styles.optionText}>Galería</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleActionSheetPress('files')}>
          <FontAwesomeIcon icon={faFile} size={40} color="#185abd" />
          <Text style={styles.optionText}>Archivos</Text>
        </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>    
    {/* Alerta personalizada */}
    {showAlert && (
      <CustomAlert
      visible={showAlert}
      onClose={() => {
        setShowAlert(false);
        if (navigateOnAccept) {
          navigation.navigate('Documentos');  // Navega a HomeScreen al aceptar
        }
      }}
      title={alertConfig.title}
      message={alertConfig.message}
      onAccept={() => {
        setShowAlert(false);
        if (navigateOnAccept) {
          navigation.navigate('Documentos');  // Navega a HomeScreen al aceptar
        }
      }}
    />
    )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  creationDate: {
    fontSize: 16,
    color: '#333',
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  headerIcon: {
    padding: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontWeight: '600',
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#ffffff',
    color: '#333',
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    backgroundColor: '#ffffff',
    color: '#333',
    height: 100,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  filesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
  },
  documentSection: {
    alignItems: 'center',
  },
  sectionLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  fileContainer: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.23,
    shadowRadius: 2.62,
    elevation: 4,
  },
  filePreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
    borderRadius: 12,
  },
  iconActions: {
    flexDirection: 'row',
    marginTop: 8,
  },
  iconButton: {
    padding: 8,
    marginHorizontal: 4,
  },
  urlContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    paddingRight: 12,
  },
  urlInput: {
    flex: 1,
    borderWidth: 0,
  },
  dateAndShareContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  dateContainer: {
    flex: 1,
    marginRight: 16,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  dateIcon: {
    marginRight: 8,
  },
  dateText: {
    fontSize: 16,
    color: '#333',
  },
  shareContainer: {
    paddingTop: 25,
    flexDirection: 'row',
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: '#185abd',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    marginTop: 10,
    marginBottom: 40
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  actionSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    paddingBottom: 40,
  },
  closeButton: {
    alignSelf: 'flex-end',
  },
  optionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
  },
  optionText: {
    textAlign: 'center',
    marginTop: 8,
    fontSize: 16,
    color: '#333',
  },
});

export default DocumentDetail;