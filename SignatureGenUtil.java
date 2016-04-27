

import java.io.BufferedInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.InputStream;
import java.security.InvalidAlgorithmParameterException;
import java.security.KeyException;
import java.security.KeyStore;
import java.security.NoSuchAlgorithmException;
import java.security.PrivateKey;
import java.security.Provider;
import java.security.PublicKey;
import java.security.Security;
import java.security.Signature;
import java.security.cert.Certificate;
import java.security.cert.CertificateException;
import java.security.cert.CertificateFactory;
import java.security.cert.X509Certificate;
import java.util.Collections;

import javax.xml.crypto.MarshalException;
import javax.xml.crypto.dsig.CanonicalizationMethod;
import javax.xml.crypto.dsig.DigestMethod;
import javax.xml.crypto.dsig.Reference;
import javax.xml.crypto.dsig.SignatureMethod;
import javax.xml.crypto.dsig.SignedInfo;
import javax.xml.crypto.dsig.Transform;
import javax.xml.crypto.dsig.XMLSignature;
import javax.xml.crypto.dsig.XMLSignatureException;
import javax.xml.crypto.dsig.XMLSignatureFactory;
import javax.xml.crypto.dsig.dom.DOMSignContext;
import javax.xml.crypto.dsig.dom.DOMValidateContext;
import javax.xml.crypto.dsig.keyinfo.KeyInfo;
import javax.xml.crypto.dsig.keyinfo.KeyInfoFactory;
import javax.xml.crypto.dsig.keyinfo.KeyValue;
import javax.xml.crypto.dsig.spec.C14NMethodParameterSpec;
import javax.xml.crypto.dsig.spec.SignatureMethodParameterSpec;
import javax.xml.crypto.dsig.spec.TransformParameterSpec;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.parsers.ParserConfigurationException;
import javax.xml.transform.Transformer;
import javax.xml.transform.TransformerConfigurationException;
import javax.xml.transform.TransformerException;
import javax.xml.transform.TransformerFactory;
import javax.xml.transform.dom.DOMSource;
import javax.xml.transform.stream.StreamResult;
import org.w3c.dom.Document;
import org.w3c.dom.NodeList;
import org.xml.sax.SAXException;

public class SignatureGenUtil {

	public static void generateXMLDigitalSignature(String originalXmlFilePath, String destnSignedXmlFilePath)
			throws InstantiationException, IllegalAccessException, ClassNotFoundException {
		// Get the XML Document object
		Document doc = getXmlDocument(originalXmlFilePath);
		// Create XML Signature Factory

/*		String providerName = "org.apache.jcp.xml.dsig.internal.dom.XMLDSigRI";
		XMLSignatureFactory xmlSigFactory = XMLSignatureFactory.getInstance("DOM",
				(Provider) Class.forName(providerName).newInstance());*/
		XMLSignatureFactory xmlSigFactory = XMLSignatureFactory
				.getInstance("DOM");
		DOMSignContext domSignCtx = new DOMSignContext(privateKey, doc.getDocumentElement());
		Reference ref = null;
		SignedInfo signedInfo = null;
		try {
			ref = xmlSigFactory.newReference("", xmlSigFactory.newDigestMethod(DigestMethod.SHA256, null),
					Collections.singletonList(
							xmlSigFactory.newTransform(Transform.ENVELOPED, (TransformParameterSpec) null)),
					null, null);

			System.out.println("xmlSigFactory.getProvider():" + xmlSigFactory.getProvider());
			signedInfo = xmlSigFactory.newSignedInfo(xmlSigFactory.newCanonicalizationMethod(
					CanonicalizationMethod.INCLUSIVE, (C14NMethodParameterSpec) null), xmlSigFactory.newSignatureMethod
					(SignatureMethod.RSA_SHA1, (SignatureMethodParameterSpec) null),
					Collections.singletonList(ref));

		} catch (NoSuchAlgorithmException ex) {
			ex.printStackTrace();
		} catch (InvalidAlgorithmParameterException ex) {
			ex.printStackTrace();
		}
		// Pass the Public Key File Path
		KeyInfo keyInfo = getKeyInfo(xmlSigFactory);
		// Create a new XML Signature

		XMLSignature xmlSignature = xmlSigFactory.newXMLSignature(signedInfo, keyInfo);

		try {
			// Sign the document
			xmlSignature.sign(domSignCtx);
		} catch (MarshalException ex) {
			ex.printStackTrace();
		} catch (XMLSignatureException ex) {
			ex.printStackTrace();
		}
		// Store the digitally signed document inta a location
		storeSignedDoc(doc, destnSignedXmlFilePath);
	}

	private static KeyInfo getKeyInfo(XMLSignatureFactory xmlSigFactory) {
		KeyInfo keyInfo = null;
		KeyValue keyValue = null;
		KeyInfoFactory keyInfoFact = xmlSigFactory.getKeyInfoFactory();

		try {
			keyValue = keyInfoFact.newKeyValue(publicKey);
		} catch (KeyException ex) {
			ex.printStackTrace();
		}
		keyInfo = keyInfoFact.newKeyInfo(Collections.singletonList(keyValue));
		return keyInfo;
	}

	private static void storeSignedDoc(Document doc, String destnSignedXmlFilePath) {
		TransformerFactory transFactory = TransformerFactory.newInstance();
		Transformer trans = null;
		try {
			trans = transFactory.newTransformer();
		} catch (TransformerConfigurationException ex) {
			ex.printStackTrace();
		}
		try {
			StreamResult streamRes = new StreamResult(new File(destnSignedXmlFilePath));
			trans.transform(new DOMSource(doc), streamRes);
		} catch (TransformerException ex) {
			ex.printStackTrace();
		}
		// System.out.println("XML file with attached digital signature
		// generated successfully ...");
	}

	private static Document getXmlDocument(String xmlFilePath) {
		Document doc = null;
		DocumentBuilderFactory dbf = DocumentBuilderFactory.newInstance();
		dbf.setNamespaceAware(true);
		try {
			doc = dbf.newDocumentBuilder().parse(new FileInputStream(xmlFilePath));
		} catch (ParserConfigurationException ex) {
			ex.printStackTrace();
		} catch (FileNotFoundException ex) {
			ex.printStackTrace();
		} catch (SAXException ex) {
			ex.printStackTrace();
		} catch (IOException ex) {
			ex.printStackTrace();
		}
		return doc;
	}

	public static boolean isXmlDigitalSignatureValid(String signedXmlFilePath) throws Exception {
		boolean validFlag = false;
		Document doc = getXmlDocument(signedXmlFilePath);
		NodeList nl = doc.getElementsByTagNameNS(XMLSignature.XMLNS, "Signature");
		if (nl.getLength() == 0) {
			throw new Exception("No XML Digital Signature Found, document is discarded");
		}
		DOMValidateContext valContext = new DOMValidateContext(publicKey, nl.item(0));
		// XMLSignatureFactory fac = XMLSignatureFactory.getInstance("DOM");
/*		String providerName = "org.apache.jcp.xml.dsig.internal.dom.XMLDSigRI";
		XMLSignatureFactory fac = XMLSignatureFactory.getInstance("DOM",
				(Provider) Class.forName(providerName).newInstance());*/
		XMLSignatureFactory fac = XMLSignatureFactory
				.getInstance("DOM");
		XMLSignature signature = fac.unmarshalXMLSignature(valContext);
		validFlag = signature.validate(valContext);
		return validFlag;
	}

	private static PrivateKey privateKey = null;
	private static PublicKey publicKey = null;

	public static void main(String[] args)
			throws NoSuchAlgorithmException, InstantiationException, IllegalAccessException, ClassNotFoundException {
		init();

                System.out.println("java - after init: "+args[0]);

		// Call to generate digital signature
		String qualifiedPathXMLToBeSigned = "xml/"+args[0]+".xml";
		String generatedSignedXML = "xml/"+args[0]+"_signed.xml";
		generateXMLDigitalSignature(qualifiedPathXMLToBeSigned,
				generatedSignedXML);
		System.out.println("XML signature generated at "+ generatedSignedXML);
		try {
			// Call to validate digital signature
			String targetSignedXML =  generatedSignedXML;//"D:\\signer\\ReqPay1_signed.xml";
			boolean validationResult = isXmlDigitalSignatureValid(targetSignedXML);
			System.out.println("Is target XML signature valid? " + validationResult);
		} catch (Exception e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}

	}

	private static void init() {
		try {

			/* getting data for keystore */
			File signerFile = new File("xml/certificate1.p12");
			FileInputStream is = new FileInputStream(signerFile);
			KeyStore keystore = KeyStore.getInstance("PKCS12");

			/* Information for certificate to be generated */
			String password = "12345";
			String alias = "1";

			/* getting the key */
			keystore.load(((InputStream) is), password.toCharArray());
			PrivateKey key = (PrivateKey) keystore.getKey(alias, password.toCharArray());

			privateKey = key;

			/* Get certificate of public key */
			java.security.cert.Certificate cert = getCertificate("ssl/cpay-ssl.crt");

			// System.out.println("Not
			// after:"+((X509Certificate)cert).getNotAfter());

			publicKey = cert.getPublicKey();
                        System.out.println("private key"+privateKey);
                        System.out.println("public key"+publicKey);      

		} catch (Exception e) {
			e.printStackTrace();
		}

	}

	private static Certificate getCertificate(String file) throws CertificateException, FileNotFoundException {
		CertificateFactory cf = CertificateFactory.getInstance("X.509");
		InputStream is = new FileInputStream(new File(file));
		InputStream caInput = new BufferedInputStream(is);
		Certificate ca;
		try {
			ca = cf.generateCertificate(caInput);
			return ca;
		} finally {
			try {
				caInput.close();
			} catch (IOException e) {
			}
			try {
				is.close();
			} catch (IOException e) {
			}
		}
	}

}
