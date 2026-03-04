require 'xcodeproj'

project_path = 'ios/App/App.xcodeproj'
project = Xcodeproj::Project.open(project_path)
target = project.targets.find { |t| t.name == 'App' }
app_group = project.main_group.find_subpath('App', true)

# Remove WidgetSyncPlugin.m reference if it exists
m_file_name = 'WidgetSyncPlugin.m'
m_file_ref = app_group.files.find { |f| f.path == m_file_name }

if m_file_ref
  # Remove from build phase
  target.source_build_phase.files_references.delete(m_file_ref)
  # Remove from group map
  m_file_ref.remove_from_project
  puts "Removed #{m_file_name} from PBXProject."
else
  puts "#{m_file_name} not found in project."
end

project.save
puts "Xcode project re-saved successfully."
