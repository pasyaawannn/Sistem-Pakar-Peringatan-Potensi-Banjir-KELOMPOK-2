import { CloudRain, Clock, Waves, Mountain, Map, History, AlertTriangle } from 'lucide-react';

export const VARIABLES_CONFIG = [
  {
    id: 'CH',
    label: 'Curah Hujan',
    icon: CloudRain,
    options: [
      { id: 'CH1', label: 'Ringan', desc: '<20 mm/hari' },
      { id: 'CH2', label: 'Sedang', desc: '20-50 mm/hari' },
      { id: 'CH3', label: 'Lebat', desc: '50-100 mm/hari' },
      { id: 'CH4', label: 'Sangat Lebat', desc: '100-150 mm/hari' },
      { id: 'CH5', label: 'Ekstrem', desc: '>150 mm/hari' },
    ]
  },
  {
    id: 'DH',
    label: 'Durasi Hujan',
    icon: Clock,
    options: [
      { id: 'DH1', label: 'Pendek', desc: '<2 jam' },
      { id: 'DH2', label: 'Sedang', desc: '2-6 jam' },
      { id: 'DH3', label: 'Panjang', desc: '>6 jam' },
    ]
  },
  {
    id: 'KD',
    label: 'Kondisi Drainase',
    icon: Waves,
    options: [
      { id: 'KD1', label: 'Baik', desc: 'Kapasitas memadai' },
      { id: 'KD2', label: 'Buruk', desc: 'Tersumbat / tidak memadai' },
    ]
  },
  {
    id: 'KW',
    label: 'Ketinggian Wilayah',
    icon: Mountain,
    options: [
      { id: 'KW1', label: 'Tinggi', desc: '>100 mdpl' },
      { id: 'KW2', label: 'Sedang', desc: '10-100 mdpl' },
      { id: 'KW3', label: 'Rendah', desc: '<10 mdpl' },
    ]
  },
  {
    id: 'KS',
    label: 'Kedekatan Sungai',
    icon: Map,
    options: [
      { id: 'KS1', label: 'Jauh', desc: '>500m' },
      { id: 'KS2', label: 'Dekat', desc: '100-500m' },
      { id: 'KS3', label: 'Sangat Dekat', desc: '<100m' },
    ]
  },
  {
    id: 'RB',
    label: 'Riwayat Banjir',
    icon: History,
    options: [
      { id: 'RB1', label: 'Tidak Pernah', desc: 'Tidak ada dlm 5 thn' },
      { id: 'RB2', label: 'Pernah', desc: '1-2x dlm 5 thn' },
      { id: 'RB3', label: 'Sering', desc: '>2x dlm 5 thn' },
    ]
  },
  {
    id: 'PD',
    label: 'Peringatan Dini BMKG',
    icon: AlertTriangle,
    options: [
      { id: 'PD1', label: 'Normal', desc: 'Tidak ada peringatan' },
      { id: 'PD2', label: 'Waspada', desc: 'Hujan Sedang-Lebat' },
      { id: 'PD3', label: 'Siaga', desc: 'Hujan Lebat-Sangat Lebat' },
      { id: 'PD4', label: 'Awas', desc: 'Sangat Lebat-Ekstrem' },
    ]
  }
];
